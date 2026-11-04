import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanLimitsService } from '../common/plan-limits.service';
import { PrismaService } from '../database/prisma.service';
import {
  assetLocation,
  compareNames,
  generatedAssetName,
  planGeneration,
  spaceLabel,
} from './building-plan';
import {
  CreateFloorDto,
  CreateSpaceDto,
  GenerateRoomsDto,
  UpdateFloorDto,
  UpdateSpaceDto,
} from './dto/building.dto';

const ASSET_SELECT = {
  id: true,
  name: true,
  category: true,
  brand: true,
  model: true,
  status: true,
} satisfies Prisma.AssetSelect;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Estructura del edificio de un sitio: plantas, habitaciones y zonas
 * comunes, y qué equipos hay en cada una. Todo queda dentro de la
 * empresa: cada consulta filtra por companyId y por el sitio.
 */
@Injectable()
export class BuildingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  // ---------------------------------------------------------------
  // Consultar
  // ---------------------------------------------------------------

  async get(companyId: string, siteId: string) {
    const site = await this.findSite(companyId, siteId);

    const [floors, unplaced] = await Promise.all([
      this.prisma.floor.findMany({
        where: { companyId, siteId },
        orderBy: { level: 'asc' },
        include: {
          spaces: {
            include: { assets: { select: ASSET_SELECT, orderBy: { name: 'asc' } } },
          },
        },
      }),
      this.prisma.asset.findMany({
        where: { companyId, siteId, spaceId: null },
        select: ASSET_SELECT,
        orderBy: { name: 'asc' },
      }),
    ]);

    let rooms = 0;
    let commons = 0;
    let placed = 0;

    const serializedFloors = floors.map((floor) => {
      // Primero las zonas comunes y luego las habitaciones, cada grupo en orden.
      const spaces = [...floor.spaces].sort((a, b) =>
        a.kind === b.kind ? compareNames(a.name, b.name) : a.kind === 'COMMON' ? -1 : 1,
      );

      for (const space of spaces) {
        if (space.kind === 'ROOM') rooms += 1;
        else commons += 1;
        placed += space.assets.length;
      }

      return {
        id: floor.id,
        level: floor.level,
        name: floor.name,
        spaces: spaces.map((space) => ({
          id: space.id,
          kind: space.kind,
          name: space.name,
          label: spaceLabel(space.kind, space.name),
          category: space.category,
          notes: space.notes,
          assets: space.assets,
        })),
      };
    });

    return {
      site,
      floors: serializedFloors,
      unplacedAssets: unplaced,
      totals: {
        floors: floors.length,
        rooms,
        commons,
        placedAssets: placed,
        unplacedAssets: unplaced.length,
      },
    };
  }

  // ---------------------------------------------------------------
  // Plantas
  // ---------------------------------------------------------------

  async createFloor(companyId: string, siteId: string, dto: CreateFloorDto) {
    await this.findSite(companyId, siteId);
    await this.assertLevelFree(companyId, siteId, dto.level);

    try {
      return await this.prisma.floor.create({
        data: { companyId, siteId, level: dto.level, name: dto.name },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw this.levelTaken(dto.level);
      throw error;
    }
  }

  async updateFloor(companyId: string, siteId: string, floorId: string, dto: UpdateFloorDto) {
    const floor = await this.findFloor(companyId, siteId, floorId);

    if (dto.level !== undefined && dto.level !== floor.level) {
      await this.assertLevelFree(companyId, siteId, dto.level);
    }

    const name = dto.name ?? floor.name;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.floor.update({
          where: { id: floor.id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.level !== undefined ? { level: dto.level } : {}),
          },
        });

        // La ubicación de cada equipo lleva el nombre de la planta.
        if (name !== floor.name) {
          const spaces = await tx.space.findMany({
            where: { floorId: floor.id },
            select: { id: true, kind: true, name: true },
          });
          for (const space of spaces) {
            await tx.asset.updateMany({
              where: { companyId, spaceId: space.id },
              data: { location: assetLocation(name, space.kind, space.name) },
            });
          }
        }

        return updated;
      });
    } catch (error) {
      if (isUniqueViolation(error) && dto.level !== undefined) throw this.levelTaken(dto.level);
      throw error;
    }
  }

  async deleteFloor(companyId: string, siteId: string, floorId: string) {
    const floor = await this.findFloor(companyId, siteId, floorId);

    const assets = await this.prisma.asset.count({
      where: { companyId, space: { floorId: floor.id } },
    });
    if (assets > 0) {
      throw new BadRequestException(
        `«${floor.name}» tiene ${assets} equipo${assets === 1 ? '' : 's'}. Quítalos o muévelos a otra planta antes de borrarla.`,
      );
    }

    await this.prisma.floor.delete({ where: { id: floor.id } });
    return { deleted: true };
  }

  // ---------------------------------------------------------------
  // Habitaciones y zonas comunes
  // ---------------------------------------------------------------

  async createSpace(companyId: string, siteId: string, dto: CreateSpaceDto) {
    const floor = await this.findFloor(companyId, siteId, dto.floorId);

    if (dto.kind === 'ROOM') {
      await this.assertRoomFree(companyId, siteId, dto.name);
    }

    try {
      return await this.prisma.space.create({
        data: {
          companyId,
          siteId,
          floorId: floor.id,
          kind: dto.kind,
          name: dto.name,
          category: dto.kind === 'COMMON' ? (dto.category ?? null) : null,
          notes: dto.notes ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw this.nameTaken(dto.name, floor.name);
      throw error;
    }
  }

  async updateSpace(companyId: string, siteId: string, spaceId: string, dto: UpdateSpaceDto) {
    const space = await this.findSpace(companyId, siteId, spaceId);
    const floor =
      dto.floorId && dto.floorId !== space.floorId
        ? await this.findFloor(companyId, siteId, dto.floorId)
        : space.floor;
    const name = dto.name ?? space.name;

    if (space.kind === 'ROOM' && name !== space.name) {
      await this.assertRoomFree(companyId, siteId, name, space.id);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.space.update({
          where: { id: space.id },
          data: {
            floorId: floor.id,
            name,
            ...(dto.category !== undefined && space.kind === 'COMMON'
              ? { category: dto.category }
              : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          },
        });

        if (name !== space.name || floor.id !== space.floorId) {
          await tx.asset.updateMany({
            where: { companyId, spaceId: space.id },
            data: { location: assetLocation(floor.name, space.kind, name) },
          });
        }

        return updated;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw this.nameTaken(name, floor.name);
      throw error;
    }
  }

  async deleteSpace(companyId: string, siteId: string, spaceId: string) {
    const space = await this.findSpace(companyId, siteId, spaceId);

    const assets = await this.prisma.asset.count({
      where: { companyId, spaceId: space.id },
    });
    if (assets > 0) {
      throw new BadRequestException(
        `«${spaceLabel(space.kind, space.name)}» tiene ${assets} equipo${assets === 1 ? '' : 's'}. Quítalos o muévelos antes de borrarla.`,
      );
    }

    await this.prisma.space.delete({ where: { id: space.id } });
    return { deleted: true };
  }

  // ---------------------------------------------------------------
  // Generador
  // ---------------------------------------------------------------

  /**
   * Crea las plantas y habitaciones que faltan y, si se pide, un equipo en
   * cada habitación del rango que todavía no tenga ninguno. Se puede
   * repetir sin duplicar: lo que ya existe se salta.
   */
  async generate(companyId: string, siteId: string, dto: GenerateRoomsDto) {
    const site = await this.findSite(companyId, siteId);

    const result = planGeneration(dto);
    if (!result.ok) throw new BadRequestException(result.problem);
    const { plan } = result;

    const levels = plan.floors.map((f) => f.level);
    const plannedRooms = plan.floors.flatMap((f) => f.rooms);

    const [existingFloors, existingRooms] = await Promise.all([
      this.prisma.floor.findMany({
        where: { companyId, siteId, level: { in: levels } },
        select: { id: true, level: true },
      }),
      this.prisma.space.findMany({
        where: { companyId, siteId, kind: 'ROOM', name: { in: plannedRooms } },
        select: { id: true, name: true, _count: { select: { assets: true } } },
      }),
    ]);

    const existingNames = new Set(existingRooms.map((r) => r.name));
    const newRooms = plannedRooms.filter((name) => !existingNames.has(name));
    const equipment = dto.equipment ?? null;

    // Cuántos equipos se van a crear: uno por habitación nueva y uno por
    // cada habitación ya existente que siga vacía.
    const emptyExisting = existingRooms.filter((r) => r._count.assets === 0).length;
    const assetsToCreate = equipment ? newRooms.length + emptyExisting : 0;
    await this.planLimits.assertAssetCapacity(companyId, assetsToCreate);

    return this.prisma.$transaction(
      async (tx) => {
        const floorsByLevel = new Map(existingFloors.map((f) => [f.level, f.id]));
        const missingFloors = plan.floors.filter((f) => !floorsByLevel.has(f.level));

        if (missingFloors.length > 0) {
          await tx.floor.createMany({
            data: missingFloors.map((f) => ({
              companyId,
              siteId,
              level: f.level,
              name: f.name,
            })),
            skipDuplicates: true,
          });
          const created = await tx.floor.findMany({
            where: { companyId, siteId, level: { in: missingFloors.map((f) => f.level) } },
            select: { id: true, level: true },
          });
          for (const f of created) floorsByLevel.set(f.level, f.id);
        }

        const roomRows: Prisma.SpaceCreateManyInput[] = [];
        for (const floor of plan.floors) {
          const floorId = floorsByLevel.get(floor.level);
          if (!floorId) continue;
          for (const name of floor.rooms) {
            if (existingNames.has(name)) continue;
            roomRows.push({ companyId, siteId, floorId, kind: 'ROOM', name });
          }
        }

        const createdRooms =
          roomRows.length > 0
            ? (await tx.space.createMany({ data: roomRows, skipDuplicates: true })).count
            : 0;

        let assetsCreated = 0;
        if (equipment) {
          const emptyRooms = await tx.space.findMany({
            where: {
              companyId,
              siteId,
              kind: 'ROOM',
              name: { in: plannedRooms },
              assets: { none: {} },
            },
            select: { id: true, name: true, floor: { select: { name: true } } },
          });

          if (emptyRooms.length > 0) {
            const result = await tx.asset.createMany({
              data: emptyRooms.map((room) => ({
                companyId,
                customerId: site.customerId,
                siteId,
                spaceId: room.id,
                name: generatedAssetName(equipment.category, room.name),
                category: equipment.category,
                brand: equipment.brand ?? null,
                model: equipment.model ?? null,
                location: assetLocation(room.floor.name, 'ROOM', room.name),
              })),
            });
            assetsCreated = result.count;
          }
        }

        return {
          floorsCreated: missingFloors.length,
          roomsCreated: createdRooms,
          roomsSkipped: plannedRooms.length - createdRooms,
          assetsCreated,
        };
      },
      { timeout: 30000 },
    );
  }

  // ---------------------------------------------------------------
  // Comprobaciones
  // ---------------------------------------------------------------

  private async findSite(companyId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: {
        id: true,
        name: true,
        customerId: true,
        customer: { select: { id: true, name: true } },
      },
    });
    if (!site) throw new NotFoundException('Sitio no encontrado.');
    return site;
  }

  private async findFloor(companyId: string, siteId: string, floorId: string) {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, companyId, siteId },
    });
    if (!floor) throw new NotFoundException('Planta no encontrada en este sitio.');
    return floor;
  }

  private async findSpace(companyId: string, siteId: string, spaceId: string) {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, companyId, siteId },
      include: { floor: true },
    });
    if (!space) throw new NotFoundException('Habitación o zona no encontrada en este sitio.');
    return space;
  }

  private async assertLevelFree(companyId: string, siteId: string, level: number) {
    const taken = await this.prisma.floor.findFirst({
      where: { companyId, siteId, level },
      select: { name: true },
    });
    if (taken) throw this.levelTaken(level, taken.name);
  }

  // Un número de habitación no se repite en todo el sitio.
  private async assertRoomFree(companyId: string, siteId: string, name: string, exceptId?: string) {
    const taken = await this.prisma.space.findFirst({
      where: {
        companyId,
        siteId,
        kind: 'ROOM',
        name,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { floor: { select: { name: true } } },
    });
    if (taken) {
      throw new ConflictException(`La habitación ${name} ya existe en ${taken.floor.name}.`);
    }
  }

  private levelTaken(level: number, name?: string) {
    return new ConflictException(
      `Ya hay una planta en el nivel ${level}${name ? ` (${name})` : ''}. Cada planta necesita su propio nivel.`,
    );
  }

  private nameTaken(name: string, floorName: string) {
    return new ConflictException(`Ya hay «${name}» en ${floorName}.`);
  }
}
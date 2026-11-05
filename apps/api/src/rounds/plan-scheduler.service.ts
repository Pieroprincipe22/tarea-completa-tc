import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { MaintenancePlansService } from './maintenance-plans.service';

const FIRST_RUN_MS = 30_000;
const EVERY_MS = 60 * 60_000;

/**
 * Cada hora crea las rondas de los planes preventivos que ya tocan. No se
 * arranca en los tests ni si PLAN_SCHEDULER=off (por ejemplo, si hay
 * varias copias de la API y solo una debe hacerlo; aunque lo hagan
 * varias a la vez, cada ronda se crea una sola vez).
 */
@Injectable()
export class PlanSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('PlanesPreventivos');
  private firstRun?: NodeJS.Timeout;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly plans: MaintenancePlansService) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test' || process.env.PLAN_SCHEDULER === 'off') return;

    this.firstRun = setTimeout(() => void this.run(), FIRST_RUN_MS);
    this.timer = setInterval(() => void this.run(), EVERY_MS);
    this.firstRun.unref();
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.firstRun) clearTimeout(this.firstRun);
    if (this.timer) clearInterval(this.timer);
  }

  async run(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const created = await this.plans.materializeDue({}, now);
      if (created > 0) this.logger.log(`Rondas nuevas creadas: ${created}`);
      return created;
    } catch (error) {
      this.logger.error(
        'No se pudieron revisar los planes preventivos',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    } finally {
      this.running = false;
    }
  }
}
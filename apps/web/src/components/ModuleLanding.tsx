import NewModuleLanding from '@/components/modules/ModuleLanding';

export type ModuleLandingItem = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  badgeLabel?: string;
};

export type ModuleLandingProps = {
  eyebrow?: string;
  title: string;
  description: string;
  focusTitle?: string;
  focusText?: string;
  items: ModuleLandingItem[];
};

export default function ModuleLanding({
  eyebrow = 'Módulo',
  title,
  description,
  focusText,
  items,
}: ModuleLandingProps) {
  return (
    <NewModuleLanding
      eyebrow={eyebrow}
      title={title}
      description={description}
      focusText={focusText}
      items={items.map((item) => ({
        title: item.title,
        description: item.description,
        href: item.href,
        comingSoon: item.comingSoon,
      }))}
    />
  );
}
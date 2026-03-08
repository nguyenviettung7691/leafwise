import PlantDetailPageClient from './PlantDetailPageClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function PlantDetailPage() {
  return <PlantDetailPageClient />;
}

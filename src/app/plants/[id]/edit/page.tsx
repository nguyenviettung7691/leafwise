import EditPlantPageClient from './EditPlantPageClient';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function EditPlantPage() {
  return <EditPlantPageClient />;
}

import LocationClientPage from "./LocationClientPage";

export default async function LocationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <LocationClientPage publicId={publicId} />;
}
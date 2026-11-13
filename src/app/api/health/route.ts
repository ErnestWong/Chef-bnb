import { getBuildInfo } from "@/lib/build-info";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      ...getBuildInfo(),
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

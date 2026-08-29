import { handleApiRequest } from "@/lib/api-router";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(req: Request, context: RouteContext) {
  const { path } = await context.params;
  return handleApiRequest(req, path);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;

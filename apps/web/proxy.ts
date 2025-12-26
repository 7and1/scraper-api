export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/playground/:path*",
    "/settings/:path*",
    "/api-keys/:path*",
  ],
};

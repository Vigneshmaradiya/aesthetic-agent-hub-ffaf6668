/* Portfolio site has no auth — disable the NextAuth middleware entirely. */

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])


export default clerkMiddleware(async (auth, req) => {
    const { userId, redirectToSignIn } = await auth()

    if (!userId && isProtectedRoute(req)) {
      // Add custom logic to run before redirecting

      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.[\\w]+$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 
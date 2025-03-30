export function isAuthenticated(req, res, next) {
  // Check if user is authenticated via Discord OAuth
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  
  // If not authenticated, redirect to login
  res.redirect('/admin/login');
} 
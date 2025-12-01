const ownerModel = require('../models/owner.model');

module.exports = async function (req, res, next) {
  try {
    // Require the user to be set by previous auth middleware
    if (!req.user) {
      req.flash('error', 'You need to login first');
      return res.redirect('/');
    }

    // If user has explicit isadmin flag, allow
    if (req.user.isadmin) return next();

    // Otherwise, check owners collection for matching email
    const owner = await ownerModel.findOne({ email: req.user.email });
    if (owner) return next();

    req.flash('error', 'You do not have permission to access this resource');
    return res.redirect('/');
  } catch (err) {
    req.flash('error', 'Something went wrong');
    return res.redirect('/');
  }
};

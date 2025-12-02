const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    },
  ],
  isadmin: Boolean,
  orders: [],
  contact: {
    type: Number,
    default: 9798714308,
  },
  picture: Buffer,
});

// Index the email field for faster lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model("user", userSchema);

import User from "../models/user.model.js";

export async function syncUser(req, res) {
  try {
    const { uid, email, name, picture } = req.firebaseUser;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        name,
        email,
        photoURL: picture,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User synced successfully",
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      data: null,
    });
  }
}

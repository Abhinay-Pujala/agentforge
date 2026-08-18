import User from "../models/user.model.js";
import Worker from "../models/worker.model.js";

export async function createWorker(req, res, next) {
  try {
    const { name, description, instructions, model, configuration } = req.body;

    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found. Please sync your account first.",
        data: null,
      });
    }

    const worker = await Worker.create({
      owner: user._id,
      name,
      description,
      instructions,
      model,
      configuration,
    });

    return res.status(201).json({
      success: true,
      message: "Worker created successfully.",
      data: worker,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkers(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found. Please sync your account first.",
        data: null,
      });
    }

    const workers = await Worker.find({
      owner: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Workers fetched successfully",
      data: workers,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkerById(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const worker = await Worker.findOne({
      owner: user._id,
      _id: req.params.id,
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Worker fetched successfully",
      data: worker,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWorker(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not fouund. Please sync your account first.",
        data: null,
      });
    }

    const { name, description, instructions, model, configuration, status } =
      req.body;

    const worker = await Worker.findOneAndUpdate(
      {
        owner: user._id,
        _id: req.params.id,
      },
      {
        name,
        description,
        instructions,
        model,
        configuration,
        status,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Worker updated successfully.",
      data: worker,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorker(req, res, next) {
  try {
    const user = await User.findOne({
      firebaseUid: req.firebaseUser.uid,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
        data: null,
      });
    }

    const worker = await Worker.findOneAndDelete({
      owner: user._id,
      _id: req.params.id,
    });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Worker deleted successfully.",
      data: worker,
    });
  } catch (err) {
    next(err);
  }
}

export async function runWorker(req, res, next) {
  try {
    const { id } = req.params;
    const { input } = req.body;

    return res.status(200).json({
      success: true,
      message: "Worker execution request accepted.",
      data: {
        workerId: id,
        input,
      },
    });
  } catch (err) {
    next(err);
  }
}

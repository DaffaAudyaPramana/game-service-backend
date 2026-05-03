import multer from "multer";
import path from "path";

// hanya allow image
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File harus JPG/PNG"), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const orderId = req.params.orderId;
    const ext = path.extname(file.originalname);

    // 🔥 rename pakai orderId
    cb(null, `${orderId}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter,

  // 🔥 LIMIT SIZE (2MB)
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export default upload;
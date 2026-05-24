import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(process.argv[2] || "ChangeMe123!", 10);
console.log(hash);

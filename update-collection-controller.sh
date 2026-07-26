sed -i '1i import jwt from "jsonwebtoken";\nimport { prisma } from "../db";' server/src/controllers/collection.controller.ts

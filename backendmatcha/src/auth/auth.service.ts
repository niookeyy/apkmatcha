import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'matchaboy_secret_key_ganti_di_production';
const JWT_EXPIRES = '12h';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(data: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashed,
        role: data.role || 'ADMIN',
      },
    });
  }

  async login(data: any) {
    const user = await this.prisma.user.findUnique({
      where: { username: data.username.trim() },
    });

    if (!user) throw new Error('User tidak ditemukan');

    const match = await bcrypt.compare(data.password, user.password);
    if (!match) throw new Error('Password salah');

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    );

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      token,
    };
  }

  // Verifikasi token — dipakai oleh endpoint /auth/verify
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { valid: true, payload: decoded };
    } catch (err: any) {
      return { valid: false, reason: err.message };
    }
  }
}
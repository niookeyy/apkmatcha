import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
      where: { username: data.username },
    });

    if (!user) throw new Error('User tidak ditemukan');

    const match = await bcrypt.compare(data.password, user.password);

    if (!match) throw new Error('Password salah');

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };
  }
}
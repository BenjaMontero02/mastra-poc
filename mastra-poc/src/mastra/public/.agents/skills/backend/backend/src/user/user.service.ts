import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEntraId(entraId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { entraId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findOrCreate(
    entraId: string,
    email: string,
    name: string,
  ): Promise<User> {
    const existing = await this.findByEntraId(entraId);
    if (existing) {
      return existing;
    }
    return this.create({ entraId, email, name });
  }
}

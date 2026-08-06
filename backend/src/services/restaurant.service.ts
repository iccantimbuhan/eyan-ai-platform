import { restaurantRepository, RestaurantRepository } from "../repositories/restaurant.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapRestaurantToResponse } from "../dto/restaurant.mapper.js";
import type { CreateRestaurantDto, UpdateRestaurantDto } from "../dto/restaurant.dto.js";

export class RestaurantService {
  constructor(private readonly repository: RestaurantRepository = restaurantRepository) {}

  async list(organizationId: string) {
    const restaurants = await this.repository.findManyByOrganizationIds([organizationId]);
    return restaurants.map(mapRestaurantToResponse);
  }

  async getById(id: string) {
    const restaurant = await this.repository.findById(id);

    if (!restaurant) {
      throw new NotFoundError("Restaurant not found.");
    }

    return mapRestaurantToResponse(restaurant);
  }

  async create(organizationId: string, data: CreateRestaurantDto) {
    const restaurant = await this.repository.create({
      organizationId,
      name: data.name,
    });

    return mapRestaurantToResponse(restaurant);
  }

  async update(id: string, data: UpdateRestaurantDto) {
    await this.getById(id);

    const restaurant = await this.repository.update(id, { name: data.name });

    return mapRestaurantToResponse(restaurant);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const restaurantService = new RestaurantService();

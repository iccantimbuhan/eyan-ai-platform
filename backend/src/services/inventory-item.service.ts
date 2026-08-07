import {
  inventoryItemRepository,
  InventoryItemRepository,
} from "../repositories/inventory-item.repository.js";
import {
  branchRepository as defaultBranchRepository,
  BranchRepository,
} from "../repositories/branch.repository.js";
import {
  ingredientRepository as defaultIngredientRepository,
  IngredientRepository,
} from "../repositories/ingredient.repository.js";
import {
  unitRepository as defaultUnitRepository,
  UnitRepository,
} from "../repositories/unit.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  InventoryItemAlreadyExistsError,
  InventoryScopeMismatchError,
} from "../errors/inventory.error.js";
import { mapInventoryItemToResponse } from "../dto/inventory-item.mapper.js";
import type { CreateInventoryItemDto, UpdateInventoryItemDto } from "../dto/inventory-item.dto.js";

export class InventoryItemService {
  constructor(
    private readonly repository: InventoryItemRepository = inventoryItemRepository,
    private readonly branchRepository: BranchRepository = defaultBranchRepository,
    private readonly ingredientRepository: IngredientRepository = defaultIngredientRepository,
    private readonly unitRepository: UnitRepository = defaultUnitRepository
  ) {}

  async list(branchId: string) {
    const items = await this.repository.findManyByBranchId(branchId);
    return items.map(mapInventoryItemToResponse);
  }

  async getById(id: string) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new NotFoundError("Inventory item not found.");
    }

    return mapInventoryItemToResponse(item);
  }

  // branchId is already authorized by requireBranchAccess at the route, but
  // ingredientId/unitId are client-supplied and could otherwise point at a
  // row under a different Restaurant. Mirrors
  // RecipeIngredientService.assertBelongsToRestaurant.
  private async assertBelongsToRestaurant(restaurantId: string, ingredientId: string, unitId: string) {
    const [ingredient, unit] = await Promise.all([
      this.ingredientRepository.findById(ingredientId),
      this.unitRepository.findById(unitId),
    ]);

    if (!ingredient || ingredient.restaurantId !== restaurantId) {
      throw new InventoryScopeMismatchError("This ingredient does not belong to the given branch's restaurant.");
    }

    if (!unit || unit.restaurantId !== restaurantId) {
      throw new InventoryScopeMismatchError("This unit does not belong to the given branch's restaurant.");
    }
  }

  async create(branchId: string, data: CreateInventoryItemDto, createdById: string) {
    const branch = await this.branchRepository.findById(branchId);

    if (!branch) {
      throw new NotFoundError("Branch not found.");
    }

    await this.assertBelongsToRestaurant(branch.restaurantId, data.ingredientId, data.unitId);

    const existing = await this.repository.findByBranchAndIngredient(branchId, data.ingredientId);
    if (existing) {
      throw new InventoryItemAlreadyExistsError();
    }

    const item = await this.repository.createWithOpeningStock({
      branchId,
      restaurantId: branch.restaurantId,
      ingredientId: data.ingredientId,
      unitId: data.unitId,
      openingQuantity: data.openingQuantity,
      minimumQuantity: data.minimumQuantity,
      reason: data.reason ?? null,
      createdById,
    });

    return mapInventoryItemToResponse(item);
  }

  async update(id: string, data: UpdateInventoryItemDto) {
    await this.getById(id);

    const item = await this.repository.update(id, { minimumQuantity: data.minimumQuantity });

    return mapInventoryItemToResponse(item);
  }
}

export const inventoryItemService = new InventoryItemService();

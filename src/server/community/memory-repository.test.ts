import { agencyAccountContract } from "@/server/identity/agency-account.contract";
import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { communityRepositoryContract } from "./repository.contract";

communityRepositoryContract("memory repository", async () => new MemoryPlatformRepository());
agencyAccountContract("memory repository", async () => new MemoryPlatformRepository());

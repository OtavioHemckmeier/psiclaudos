import { CatalogModule } from './catalog.module';
import { CatalogService } from './catalog.service';

describe('CatalogModule initialization', () => {
  const originalCatalog = process.env.SEED_CATALOG;
  const originalDemo = process.env.SEED_DEMO_INSTRUMENT;
  const catalog = {
    seedCatalog: jest.fn().mockResolvedValue(undefined),
    seedDemo: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SEED_CATALOG;
    delete process.env.SEED_DEMO_INSTRUMENT;
  });

  afterEach(() => {
    if (originalCatalog === undefined) delete process.env.SEED_CATALOG;
    else process.env.SEED_CATALOG = originalCatalog;
    if (originalDemo === undefined) delete process.env.SEED_DEMO_INSTRUMENT;
    else process.env.SEED_DEMO_INSTRUMENT = originalDemo;
  });

  it.each([undefined, 'false'])('initializes the catalog with demo setting %s', async (demoSetting) => {
    if (demoSetting !== undefined) process.env.SEED_DEMO_INSTRUMENT = demoSetting;
    await new CatalogModule(catalog as unknown as CatalogService).onModuleInit();
    expect(catalog.seedCatalog).toHaveBeenCalledTimes(1);
    expect(catalog.seedDemo).not.toHaveBeenCalled();
  });

  it('initializes both when demonstration data is requested', async () => {
    process.env.SEED_DEMO_INSTRUMENT = 'true';
    await new CatalogModule(catalog as unknown as CatalogService).onModuleInit();
    expect(catalog.seedCatalog).toHaveBeenCalledTimes(1);
    expect(catalog.seedDemo).toHaveBeenCalledTimes(1);
  });

  it('respects an explicit catalog initialization opt-out', async () => {
    process.env.SEED_CATALOG = 'false';
    await new CatalogModule(catalog as unknown as CatalogService).onModuleInit();
    expect(catalog.seedCatalog).not.toHaveBeenCalled();
    expect(catalog.seedDemo).not.toHaveBeenCalled();
  });
});

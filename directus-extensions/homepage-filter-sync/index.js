const FIELD_IDS = {
  fixture: 50,
  temperature: 51,
};

function parseFilters(value) {
  const seen = new Set();

  return String(value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;

      const key = item.toLocaleLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function toOptions(filters) {
  return {
    choices: filters.map((filter) => ({
      text: filter,
      value: filter,
    })),
  };
}

export default ({ action }, { database, logger }) => {
  action('homepage.items.update', async () => {
    try {
      const homepage = await database('homepage')
        .select('fixture_filters', 'temperature_filters')
        .where({ id: 1 })
        .first();

      if (!homepage) return;

      await database.transaction(async (transaction) => {
        // Metadata is updated directly because Directus 11 caches field options.
        // The admin receives the fresh selector values on the next item open.
        await transaction('directus_fields')
          .where({ id: FIELD_IDS.fixture })
          .update({ options: JSON.stringify(toOptions(parseFilters(homepage.fixture_filters))) });

        await transaction('directus_fields')
          .where({ id: FIELD_IDS.temperature })
          .update({ options: JSON.stringify(toOptions(parseFilters(homepage.temperature_filters))) });
      });
    } catch (error) {
      logger.error(error, 'Failed to synchronize homepage image filters');
    }
  });
};

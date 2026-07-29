export const SAMPLE_COUNTRIES_SCHEMA = {
  queryType: { name: 'Query' },
  mutationType: { name: 'Mutation' },
  types: [
    {
      name: 'Query',
      kind: 'OBJECT',
      description: 'Root Query Type',
      fields: [
        {
          name: 'countries',
          description: 'Get list of countries',
          args: [
            { name: 'filter', type: { kind: 'INPUT_OBJECT', name: 'CountryFilterInput' } }
          ],
          type: { kind: 'LIST', ofType: { kind: 'OBJECT', name: 'Country' } }
        },
        {
          name: 'country',
          description: 'Get country by ISO code',
          args: [
            { name: 'code', type: { kind: 'NON_NULL', ofType: { kind: 'SCALAR', name: 'ID' } } }
          ],
          type: { kind: 'OBJECT', name: 'Country' }
        },
        {
          name: 'continents',
          description: 'Get list of continents',
          args: [],
          type: { kind: 'LIST', ofType: { kind: 'OBJECT', name: 'Continent' } }
        }
      ]
    },
    {
      name: 'Mutation',
      kind: 'OBJECT',
      description: 'Root Mutation Type',
      fields: [
        {
          name: 'updateCountry',
          description: 'Update country details',
          args: [
            { name: 'code', type: { kind: 'NON_NULL', ofType: { kind: 'SCALAR', name: 'ID' } } },
            { name: 'name', type: { kind: 'SCALAR', name: 'String' } }
          ],
          type: { kind: 'OBJECT', name: 'Country' }
        }
      ]
    },
    {
      name: 'Country',
      kind: 'OBJECT',
      description: 'Country entity',
      fields: [
        { name: 'code', type: { kind: 'SCALAR', name: 'ID' }, description: 'ISO 2-letter code' },
        { name: 'name', type: { kind: 'SCALAR', name: 'String' }, description: 'Country display name' },
        { name: 'native', type: { kind: 'SCALAR', name: 'String' }, description: 'Native language name' },
        { name: 'capital', type: { kind: 'SCALAR', name: 'String' }, description: 'Capital city' },
        { name: 'currency', type: { kind: 'SCALAR', name: 'String' }, description: 'Currency code' },
        { name: 'emoji', type: { kind: 'SCALAR', name: 'String' }, description: 'Flag emoji' },
        { name: 'continent', type: { kind: 'OBJECT', name: 'Continent' }, description: 'Parent continent' }
      ]
    },
    {
      name: 'Continent',
      kind: 'OBJECT',
      description: 'Continent entity',
      fields: [
        { name: 'code', type: { kind: 'SCALAR', name: 'ID' }, description: 'Continent ISO code' },
        { name: 'name', type: { kind: 'SCALAR', name: 'String' }, description: 'Continent name' }
      ]
    }
  ]
};

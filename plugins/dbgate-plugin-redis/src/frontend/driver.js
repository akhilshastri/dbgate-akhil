const { driverBase } = global.DBGATE_TOOLS;
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'redis@dbgate-plugin-redis',
  title: 'Redis',
  defaultPort: 6379,
  databaseEngineTypes: ['keyvalue'],
  supportedKeyTypes: [
    {
      name: 'string',
      label: 'String',
      dbKeyFields: [{ name: 'value' }],
      addMethod: 'set',
    },
    {
      name: 'list',
      label: 'List',
      dbKeyFields: [{ name: 'value' }],
      addMethod: 'rpush',
      showItemList: true,
    },
    {
      name: 'set',
      label: 'Set',
      dbKeyFields: [{ name: 'value' }],
      keyColumn: 'value',
      addMethod: 'sadd',
      showItemList: true,
    },
    {
      name: 'zset',
      label: 'Sorted Set',
      dbKeyFields: [{ name: 'score' }, { name: 'value' }],
      keyColumn: 'value',
      addMethod: 'zadd',
      showItemList: true,
    },
    {
      name: 'hash',
      label: 'Hash',
      dbKeyFields: [{ name: 'key' }, { name: 'value' }],
      keyColumn: 'key',
      addMethod: 'hset',
      showItemList: true,
    },
  ],

  showConnectionField: (field, values) => {
    return ['server', 'port', 'password'].includes(field);
  },
};

module.exports = driver;

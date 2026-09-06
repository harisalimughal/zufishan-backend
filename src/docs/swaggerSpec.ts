import swaggerUi from 'swagger-ui-express'

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Zufishan Daily Utilities & AI Assistant API',
    version: '1.0.0',
    description:
      'Complete API specification for the Daily Utilities & AI Assistant module.',
  },
  servers: [
    {
      url: '/api/v1/utilities',
      description: 'Utilities Module API Base Path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (Bearer <token>)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description message' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'latitude' },
                message: { type: 'string', example: 'latitude must be between -90 and 90' },
              },
            },
          },
        },
      },
      PrayerTimesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Prayer times fetched' },
          data: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2026-08-27' },
              hijriDate: {
                type: 'object',
                properties: {
                  day:   { type: 'integer', example: 3 },
                  month: {
                    type: 'object',
                    properties: {
                      number: { type: 'integer', example: 3 },
                      en:     { type: 'string',  example: 'Rabi al-Awwal' },
                      ar:     { type: 'string',  example: 'ربيع الأول' },
                    },
                  },
                  year: { type: 'integer', example: 1448 },
                },
              },
              method:    { type: 'string',  example: 'MWL' },
              asrMethod: { type: 'integer', example: 0, description: '0 = Standard/Shafi\'i, 1 = Hanafi' },
              location: {
                type: 'object',
                properties: {
                  latitude:  { type: 'number', example: 24.8607 },
                  longitude: { type: 'number', example: 67.0011 },
                },
              },
              timings: {
                type: 'object',
                properties: {
                  Fajr:    { type: 'string', example: '04:30' },
                  Sunrise: { type: 'string', example: '06:10' },
                  Dhuhr:   { type: 'string', example: '12:15' },
                  Asr:     { type: 'string', example: '15:45' },
                  Maghrib: { type: 'string', example: '18:35' },
                  Isha:    { type: 'string', example: '20:00' },
                  Midnight:  { type: 'string', example: '00:23', nullable: true },
                  Lastthird: { type: 'string', example: '02:15', nullable: true },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  timezone:              { type: 'string',  example: 'Asia/Karachi' },
                  calculationMethodId:   { type: 'integer', example: 3 },
                  cached:                { type: 'boolean', example: false },
                },
              },
            },
          },
        },
      },
      QiblaResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Qibla direction calculated' },
          data: {
            type: 'object',
            properties: {
              latitude: { type: 'number', example: 24.8607 },
              longitude: { type: 'number', example: 67.0011 },
              direction: { type: 'number', example: 265.45 },
              cardinal: { type: 'string', example: 'W' },
            },
          },
        },
      },
      HijriDateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Hijri date fetched' },
          data: {
            type: 'object',
            properties: {
              gregorianDate: { type: 'string', example: '2026-08-24' },
              hijri: {
                type: 'object',
                properties: {
                  day: { type: 'integer', example: 11 },
                  month: {
                    type: 'object',
                    properties: {
                      number: { type: 'integer', example: 3 },
                      en: { type: 'string', example: 'Rabi al-Awwal' },
                      ar: { type: 'string', example: 'ربيع الأول' },
                    },
                  },
                  year: { type: 'integer', example: 1448 },
                },
              },
            },
          },
        },
      },
      NisabRateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Nisab rate fetched' },
          data: {
            type: 'object',
            properties: {
              currency: { type: 'string', example: 'USD' },
              goldPricePerGram: { type: 'number', example: 75.5 },
              silverPricePerGram: { type: 'number', example: 0.95 },
              nisabGoldGrams: { type: 'number', example: 85 },
              nisabSilverGrams: { type: 'number', example: 595 },
              nisabValueGold: { type: 'number', example: 6417.5 },
              nisabValueSilver: { type: 'number', example: 565.25 },
              effectiveDate: { type: 'string', example: '2026-08-24' },
            },
          },
        },
      },
      ZakatCalculateRequest: {
        type: 'object',
        required: ['assets', 'madhab'],
        properties: {
          assets: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['category', 'value'],
              properties: {
                category: {
                  type: 'string',
                  enum: [
                    'cash',
                    'gold_silver',
                    'business_inventory',
                    'agricultural_produce',
                    'livestock',
                    'investments',
                  ],
                  example: 'cash',
                },
                value: { type: 'number', example: 10000, description: 'Monetary market value (≥ 0)' },
                irrigation: {
                  type: 'string',
                  enum: ['natural', 'artificial', 'mixed'],
                  description: 'Required for agricultural_produce',
                },
                animalType: {
                  type: 'string',
                  enum: ['camels', 'cattle', 'sheep_goats'],
                  description: 'Required for livestock',
                },
                headCount: {
                  type: 'integer',
                  example: 40,
                  description: 'Required for livestock — classical tables are headcount-based',
                },
              },
            },
          },
          madhab: {
            type: 'string',
            enum: ['hanafi', 'shafi', 'maliki', 'hanbali'],
            example: 'hanafi',
          },
          nisabThreshold: {
            type: 'number',
            example: 565.25,
            description: 'Optional wealth nisāb gate (e.g. lowerNisabValue from /nisab-rate)',
          },
          currency: { type: 'string', example: 'USD' },
        },
      },
      ZakatCalculateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Zakat calculated' },
          data: {
            type: 'object',
            properties: {
              madhab: { type: 'string', example: 'hanafi' },
              currency: { type: 'string', example: 'USD' },
              totalAssets: { type: 'number', example: 20050.0 },
              totalWealthAssets: { type: 'number', example: 15000.0 },
              totalZakat: { type: 'number', example: 501.25 },
              wealthMeetsNisab: { type: 'boolean', nullable: true, example: true },
              categoryBreakdown: { type: 'array', items: { type: 'object' } },
              categorySubtotals: { type: 'object' },
              disclaimer: { type: 'string' },
            },
          },
        },
      },
      TasbihSaveRequest: {
        type: 'object',
        required: ['phrase', 'count'],
        properties: {
          phrase: { type: 'string', example: 'SubhanAllah' },
          count: { type: 'integer', example: 33 },
          target: { type: 'integer', example: 33 },
          sessionDate: { type: 'string', example: '2026-08-24' },
        },
      },
      AiChatMessageRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'What are the rules of Zakat on gold jewelry?' },
          conversationId: { type: 'string', example: 'clx123abc456' },
        },
      },
      AiFeedbackRequest: {
        type: 'object',
        required: ['logId', 'rating'],
        properties: {
          logId: { type: 'string', example: 'clx987log123' },
          rating: { type: 'string', enum: ['helpful', 'not_helpful', 'inappropriate'], example: 'helpful' },
          comment: { type: 'string', example: 'Clear and well referenced answer.' },
        },
      },
    },
  },
  paths: {
    '/prayer-times': {
      get: {
        tags: ['Prayer Times'],
        summary: 'Get Prayer Times for a specific location and date',
        description: 'Returns the five daily prayer times (plus Sunrise) computed via the AlAdhan API. Results are cached in PostgreSQL to avoid redundant external calls.',
        parameters: [
          { in: 'query', name: 'lat',       required: false, schema: { type: 'number' }, example: 24.8607,  description: 'Latitude (alias for latitude)' },
          { in: 'query', name: 'lng',       required: false, schema: { type: 'number' }, example: 67.0011,  description: 'Longitude (alias for longitude)' },
          { in: 'query', name: 'latitude',  required: false, schema: { type: 'number' }, example: 24.8607,  description: 'Latitude -90 to 90 (one of lat/latitude required)' },
          { in: 'query', name: 'longitude', required: false, schema: { type: 'number' }, example: 67.0011,  description: 'Longitude -180 to 180 (one of lng/longitude required)' },
          { in: 'query', name: 'method',    required: false, schema: { type: 'string', default: 'MWL' }, example: 'MWL', description: 'Calculation method: MWL (default), ISNA, Egypt, Karachi, Makkah, Qatar, Kuwait, Singapore, Tehran, Turkey, Jafari' },
          { in: 'query', name: 'asrMethod', required: false, schema: { type: 'integer', enum: [0, 1], default: 0 }, example: 0, description: '0 = Standard/Shafi\'i (default), 1 = Hanafi' },
          { in: 'query', name: 'date',      required: false, schema: { type: 'string' }, example: '2026-08-27', description: 'YYYY-MM-DD — defaults to today (UTC)' },
        ],
        responses: {
          '200': { description: 'Success',           content: { 'application/json': { schema: { $ref: '#/components/schemas/PrayerTimesResponse' } } } },
          '400': { description: 'Validation Error',  content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          '500': { description: 'Server Error',      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/qibla': {
      get: {
        tags: ['Qibla'],
        summary: 'Calculate Qibla direction for coordinates relative to Kaaba',
        parameters: [
          { in: 'query', name: 'latitude', required: true, schema: { type: 'number' }, example: 24.8607 },
          { in: 'query', name: 'longitude', required: true, schema: { type: 'number' }, example: 67.0011 },
        ],
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/QiblaResponse' } } } },
          '400': { description: 'Validation Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          '500': { description: 'Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/hijri-date': {
      get: {
        tags: ['Hijri Date'],
        summary: 'Convert Gregorian date to Islamic Hijri date',
        parameters: [
          { in: 'query', name: 'date', required: false, schema: { type: 'string' }, example: '2026-08-24' },
        ],
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/HijriDateResponse' } } } },
          '400': { description: 'Validation Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          '500': { description: 'Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/zakat/nisab-rate': {
      get: {
        tags: ['Zakat'],
        summary: 'Get current gold and silver nisab rates',
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/NisabRateResponse' } } } },
          '500': { description: 'Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/zakat/calculate': {
      post: {
        tags: ['Zakat'],
        summary: 'Calculate Zakat payable based on wealth inputs',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ZakatCalculateRequest' } } },
        },
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/ZakatCalculateResponse' } } } },
          '400': { description: 'Validation Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          '500': { description: 'Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/zakat/history': {
      get: {
        tags: ['Zakat'],
        summary: 'Get saved Zakat calculations history for authenticated user',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Server Error' },
        },
      },
    },
    '/azkar/categories': {
      get: {
        tags: ['Azkar'],
        summary: 'Get list of active Azkar categories',
        responses: {
          '200': { description: 'Success' },
          '500': { description: 'Server Error' },
        },
      },
    },
    '/azkar/{categoryId}/items': {
      get: {
        tags: ['Azkar'],
        summary: 'Get Azkar items under a specific category',
        parameters: [
          { in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Validation Error' },
          '500': { description: 'Server Error' },
        },
      },
    },
    '/azkar/item/{id}': {
      get: {
        tags: ['Azkar'],
        summary: 'Get single Azkar item details by ID',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Success' },
          '404': { description: 'Not Found' },
          '500': { description: 'Server Error' },
        },
      },
    },
    '/tasbih/sessions': {
      post: {
        tags: ['Tasbih'],
        summary: 'Save a completed dhikr counter session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TasbihSaveRequest' } } },
        },
        responses: {
          '201': { description: 'Created' },
          '401': { description: 'Unauthorized' },
          '400': { description: 'Validation Error' },
        },
      },
      get: {
        tags: ['Tasbih'],
        summary: 'Get Tasbih session history for authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasbih/stats': {
      get: {
        tags: ['Tasbih'],
        summary: 'Get Tasbih aggregate stats (totals, streak, most used phrase)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/ai-assistant/chat': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Send a prompt message to the AI Assistant',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiChatMessageRequest' } } },
        },
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '400': { description: 'Validation Error' },
        },
      },
    },
    '/ai-assistant/history': {
      get: {
        tags: ['AI Assistant'],
        summary: 'Get list of conversation threads for authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/ai-assistant/conversations/{conversationId}': {
      get: {
        tags: ['AI Assistant'],
        summary: 'Get full message history for a specific conversation thread',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'conversationId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not Found' },
        },
      },
    },
    '/ai-assistant/feedback': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Submit rating/feedback for an AI response log',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiFeedbackRequest' } } },
        },
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '400': { description: 'Validation Error' },
        },
      },
    },
    '/ai-assistant/admin/logs': {
      get: {
        tags: ['AI Assistant Admin'],
        summary: 'Get paginated AI logs across all users (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'userId', schema: { type: 'string' } },
          { in: 'query', name: 'modelUsed', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — Admin Role Required' },
        },
      },
    },
  },
}

export const serveSwagger = swaggerUi.serve
export const setupSwagger = swaggerUi.setup(swaggerDocument)

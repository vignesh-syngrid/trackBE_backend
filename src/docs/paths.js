/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Settings
 *   - name: Masters
 *   - name: Administration
 *   - name: Jobs
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email & password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: JWT + user info }
 */

/* ========================= Settings ========================= */

/**
 * @swagger
 * /settings/countries:
 *   get:
 *     tags: [Settings]
 *     summary: List countries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across country_name and country_code
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by country_status (true/false)
 *       - in: query
 *         name: country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: country_code
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [country_id, country_name, country_code, country_status] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Settings]
 *     summary: Create country
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country_id, country_name, country_code, country_status]
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               country_name: { type: string, example: India }
 *               country_code: { type: string, example: IN }
 *               country_status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /settings/countries/{id}:
 *   get:
 *     tags: [Settings]
 *     summary: Get country by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *   put:
 *     tags: [Settings]
 *     summary: Update country
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country_name: { type: string, example: India }
 *               country_code: { type: string, example: IN }
 *               country_status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Settings]
 *     summary: Delete country
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */

/**
 * @swagger
 * /settings/states:
 *   get:
 *     tags: [Settings]
 *     summary: List states
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across state_name
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by state_status (true/false)
 *       - in: query
 *         name: country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: state_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [state_name, state_status, state_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Settings]
 *     summary: Create state
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country_id, state_name, state_status]
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_name: { type: string, example: Andhra Pradesh }
 *               state_status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /settings/states/{id}:
 *   get:
 *     tags: [Settings]
 *     summary: Get state by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *   put:
 *     tags: [Settings]
 *     summary: Update state
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_name: { type: string, example: Andhra Pradesh }
 *               state_status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Settings]
 *     summary: Delete state
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */

/**
 * @swagger
 * /settings/districts:
 *   get:
 *     tags: [Settings]
 *     summary: List districts
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across district_name
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by district_status (true/false)
 *       - in: query
 *         name: country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: state_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: district_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [district_name, district_status, district_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Settings]
 *     summary: Create district
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country_id, state_id, district_name, district_status]
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               district_name: { type: string, example: Chittoor }
 *               district_status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /settings/districts/{id}:
 *   get:
 *     tags: [Settings]
 *     summary: Get district by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *   put:
 *     tags: [Settings]
 *     summary: Update district
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               district_name: { type: string, example: Chittoor }
 *               district_status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Settings]
 *     summary: Delete district
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */

/**
 * @swagger
 * /settings/pincodes:
 *   get:
 *     tags: [Settings]
 *     summary: List pincodes
 *     description: |
 *       List pincodes with optional availability filter. Availability indicates
 *       whether a pincode is currently mapped to any Region.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across pincode (string match)
 *       - in: query
 *         name: country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: state_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: district_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: pincode
 *         schema: { type: string }
 *       - in: query
 *         name: available
 *         schema: { type: boolean }
 *         description: |
 *           Filter by availability for region mapping. When true, returns only
 *           pincodes not mapped to any region. When false, returns only pincodes
 *           already mapped to a region. Omit to return all.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [pincode, id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Settings]
 *     summary: Create pincode
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country_id, state_id, district_id, pincode]
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               district_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               pincode: { type: string, example: "517415" }
 *               lat: { type: number, format: float, example: 13.0907 }
 *               lng: { type: number, format: float, example: 78.6084 }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /settings/pincodes/{id}:
 *   get:
 *     tags: [Settings]
 *     summary: Get pincode by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *   put:
 *     tags: [Settings]
 *     summary: Update pincode
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               district_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               pincode: { type: string, example: "517415" }
 *               lat: { type: number, format: float, example: 13.0907 }
 *               lng: { type: number, format: float, example: 78.6084 }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Settings]
 *     summary: Delete pincode
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */

/* ========================= MASTERS ========================= */

/**
 * @swagger
 * /masters/dashboard/counts:
 *   get:
 *     tags: [Masters]
 *     summary: Count roles and jobs
 *     description: Returns active role counts (excluding super admin) and job totals for the scoped company.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *         description: Optional company scope for super administrators.
 *     responses:
 *       200:
 *         description: Count summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 company_id: { type: string, format: uuid, nullable: true }
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role_id: { type: string, format: uuid }
 *                       role_name: { type: string }
 *                       role_slug: { type: string }
 *                       count: { type: integer, example: 5 }
 *                 total_jobs: { type: integer, example: 42 }
 *                 completed_jobs: { type: integer, example: 17 }
 */

/**
 * @swagger
 * /masters/nature-of-work:
 *   get:
 *     tags: [Masters]
 *     summary: List nature of work
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across now_name
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by now_status (true/false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [now_name, now_status, now_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create nature of work
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [now_name, now_status]
 *             properties:
 *               now_id: { type: string, format: uuid }
 *               now_name: { type: string, example: Phone Call }
 *               now_status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/nature-of-work/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get nature of work by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update nature of work
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               now_name: { type: string, example: Field Work }
 *               now_status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete nature of work
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/job-statuses:
 *   get:
 *     tags: [Masters]
 *     summary: List job statuses
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across job_status_title
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [job_status_title, status, job_status_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create job status
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [job_status_title, status]
 *             properties:
 *               job_status_id: { type: string, format: uuid }
 *               job_status_title: { type: string, example: not_started }
 *               status: { type: boolean, example: true }
 *               job_status_color_code: { type: string, example: "#808080" }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/job-statuses/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get job status by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update job status
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               job_status_title: { type: string, example: completed }
 *               status: { type: boolean, example: true }
 *               job_status_color_code: { type: string, example: "#22c55e" }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete job status
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/subscription-types:
 *   get:
 *     tags: [Masters]
 *     summary: List subscription types
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across subscription_title
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by subscription_status (true/false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [subscription_title, subscription_status, subscription_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create subscription type
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscription_title, subscription_status]
 *             properties:
 *               subscription_id: { type: string, format: uuid }
 *               subscription_title: { type: string, example: Free }
 *               subscription_status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/subscription-types/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get subscription type by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update subscription type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription_title: { type: string, example: Paid }
 *               subscription_status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete subscription type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/business-types:
 *   get:
 *     tags: [Masters]
 *     summary: List business types
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across business_typeName
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [business_typeName, status, business_typeId] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create business type
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [business_typeName, status]
 *             properties:
 *               business_typeId: { type: string, format: uuid }
 *               business_typeName: { type: string, example: Manufacturing }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/business-types/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get business type by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update business type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               business_typeName: { type: string, example: Retail }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete business type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/work-types:
 *   get:
 *     tags: [Masters]
 *     summary: List work types
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across worktype_name and worktype_description
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [worktype_name, status, worktype_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create work type
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [worktype_name, status]
 *             properties:
 *               company_id: { type: string, format: uuid, description: Required only for super_admin }
 *               worktype_id: { type: string, format: uuid }
 *               worktype_name: { type: string, example: Preventive Maintenance }
 *               worktype_description: { type: string, example: Planned routine checks }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/work-types/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get work type by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update work type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               worktype_name: { type: string, example: Corrective Repair }
 *               worktype_description: { type: string, example: On-demand repair after a failure }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete work type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/job-types:
 *   get:
 *     tags: [Masters]
 *     summary: List job types
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across jobtype_name and description
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: worktype_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [jobtype_name, estimated_duration, status, jobtype_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create job type
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [worktype_id, jobtype_name, estimated_duration, status]
 *             properties:
 *               company_id: { type: string, format: uuid, description: Required only for super_admin }
 *               worktype_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               jobtype_id: { type: string, format: uuid }
 *               jobtype_name: { type: string, example: AC Gas Refill }
 *               description: { type: string, example: Includes leak test and refill }
 *               estimated_duration: { type: integer, example: 120, description: Minutes }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/job-types/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get job type by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update job type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               worktype_id: { type: string, format: uuid }
 *               jobtype_name: { type: string, example: Compressor Replacement }
 *               description: { type: string, example: Replace compressor with warranty }
 *               estimated_duration: { type: integer, example: 240 }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete job type
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/regions:
 *   get:
 *     tags: [Masters]
 *     summary: List regions
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across region_name
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: country_id
 *         schema: { type: integer }
 *       - in: query
 *         name: state_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: district_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [region_name, status, region_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create region
 *     description: |
 *       Business rule: A pincode can be mapped to at most one region. If any
 *       provided pincode is already used by another region, the request fails
 *       with 400 and lists the conflicting pincodes.
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [region_name, country_id, state_id, district_id, status]
 *             properties:
 *               company_id: { type: string, format: uuid, description: Required only for super_admin }
 *               region_id: { type: string, format: uuid }
 *               region_name: { type: string, example: South Zone }
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               district_id: { type: string, format: uuid, example: "00000000-0000-0000-0000-000000000000" }
 *               pincodes:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["517415","500081"]
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad Request (pincodes already mapped to a region) }
 *       409: { description: Conflict (duplicate) }
 * /masters/regions/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get region by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update region
 *     description: |
 *       Business rule: A pincode can be mapped to at most one region. If any
 *       updated pincode is already used by another region, the request fails
 *       with 400 and lists the conflicting pincodes.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               region_name: { type: string, example: Central Zone }
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid }
 *               district_id: { type: string, format: uuid }
 *               pincodes:
 *                 type: array
 *                 items: { type: string }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Bad Request (pincodes already mapped to a region) }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete region
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/shifts:
 *   get:
 *     tags: [Masters]
 *     summary: List shifts
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across shift_name and description
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [shift_name, shift_startTime, shift_endTime, status, shift_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create shift
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shift_name, shift_startTime, shift_endTime, status]
 *             properties:
 *               company_id: { type: string, format: uuid, description: Required only for super_admin }
 *               shift_id: { type: string, format: uuid }
 *               shift_name: { type: string, example: Morning Shift }
 *               shift_startTime: { type: string, example: "09:00" }
 *               shift_endTime: { type: string, example: "17:30" }
 *               description: { type: string, example: Day operations }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/shifts/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get shift by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update shift
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id: { type: string, format: uuid }
 *               shift_name: { type: string, example: Evening Shift }
 *               shift_startTime: { type: string, example: "13:00" }
 *               shift_endTime: { type: string, example: "21:00" }
 *               description: { type: string, example: Second half ops }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete shift
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/roles:
 *   get:
 *     tags: [Masters]
 *     summary: List roles
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across role_name
 *       - in: query
 *         name: status
 *         schema: { type: boolean }
 *         description: Filter by status (true/false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [role_name, status, role_id] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Masters]
 *     summary: Create role
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_name, status]
 *             properties:
 *               role_id: { type: string, format: uuid }
 *               role_name: { type: string, example: supervisor }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict (duplicate) }
 * /masters/roles/{id}:
 *   get:
 *     tags: [Masters]
 *     summary: Get role by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK }, 404: { description: Not found } }
 *   put:
 *     tags: [Masters]
 *     summary: Update role
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_name: { type: string, example: technician }
 *               status: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 *       409: { description: Conflict (duplicate) }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Masters]
 *     summary: Delete role
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted }, 404: { description: Not found } }
 */

/**
 * @swagger
 * /masters/screens:
 *   get:
 *     tags: [Masters]
 *     summary: List screens
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search across screen_name (if applicable)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, example: screen_name }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses: { 200: { description: OK } }
 * /masters/roles/{role_id}/screens/{screen_id}:
 *   put:
 *     tags: [Masters]
 *     summary: Upsert role ↔ screen permissions
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: screen_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               can_view: { type: boolean, example: true }
 *               can_add: { type: boolean, example: false }
 *               can_edit: { type: boolean, example: false }
 *               can_delete: { type: boolean, example: false }
 *     responses:
 *       200: { description: OK }
 */

/* ========================= ADMINISTRATION ========================= */
/**
 * @swagger
 * /admin/companies:
 *   get:
 *     tags: [Administration]
 *     summary: List companies
 *     description: |
 *       Supports pagination, sorting, fuzzy search, and exact filters.
 *       **Query examples:**
 *       - `?page=1&limit=10`
 *       - `?searchParam=acme`
 *       - `?sortBy=name&order=ASC`
 *       - `?country_id=91&state_id=<uuid>&subscription_id=<uuid>&status=true`
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 }, description: Page number }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 }, description: Page size }
 *       - { in: query, name: searchParam, schema: { type: string }, description: Fuzzy search on name,email,phone,gst,city }
 *       - { in: query, name: sortBy, schema: { type: string }, description: Sort field (defaults to PK if invalid) }
 *       - { in: query, name: order, schema: { type: string, enum: [ASC, DESC] }, description: Sort order }
 *       - { in: query, name: country_id, schema: { type: integer }, description: Exact filter }
 *       - { in: query, name: state_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: subscription_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: status, schema: { type: boolean }, description: Exact filter }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Administration]
 *     summary: Create company
 *     description: Super admin only.
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               logo: { type: string, example: "https://cdn.example.com/logo.png" }
 *               name: { type: string, example: "Acme Corp" }
 *               gst: { type: string, example: "22AAAAA0000A1Z5" }
 *               email: { type: string, format: email, example: "admin@acme.com" }
 *               phone: { type: string, example: "9876543210" }
 *               password: { type: string, example: "StrongP@ssw0rd" }
 *               address_1: { type: string, example: "123 Main St" }
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "11111111-2222-3333-4444-555555555555" }
 *               city: { type: string, example: "Mumbai" }
 *               postal_code: { type: string, example: "400001" }
 *               lat: { type: number, format: float, example: 19.076 }
 *               lng: { type: number, format: float, example: 72.8777 }
 *               proof: { type: string, example: "GST-CERT-123" }
 *               subscription_id: { type: string, format: uuid, example: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
 *               no_of_users: { type: integer, example: 10 }
 *               subscription_startDate: { type: string, format: date, example: "2025-01-01" }
 *               subscription_endDate: { type: string, format: date, example: "2025-12-31" }
 *               subscription_amountPerUser: { type: number, format: float, example: 12.5 }
 *               remarks: { type: string, example: "Priority onboarding" }
 *               theme_color: { type: string, example: "#0044cc" }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 company_id: { type: string, format: uuid }
 *                 logo: { type: string }
 *                 name: { type: string }
 *                 gst: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 address_1: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 city: { type: string }
 *                 postal_code: { type: string }
 *                 lat: { type: number, format: float }
 *                 lng: { type: number, format: float }
 *                 proof: { type: string }
 *                 subscription_id: { type: string, format: uuid }
 *                 no_of_users: { type: integer }
 *                 subscription_startDate: { type: string, format: date-time }
 *                 subscription_endDate: { type: string, format: date-time }
 *                 subscription_amountPerUser: { type: number, format: float }
 *                 remarks: { type: string }
 *                 theme_color: { type: string }
 *                 status: { type: boolean }
 *       400: { description: Validation error }
 *       403: { description: Permission denied }
 *       409: { description: Conflict (duplicate email/phone) }
 * /admin/companies/{id}:
 *   get:
 *     tags: [Administration]
 *     summary: Get company by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK } }
 *   put:
 *     tags: [Administration]
 *     summary: Update company
 *     description: Super admin only.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string }
 *               name: { type: string }
 *               gst: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, description: "If set, will be hashed" }
 *               address_1: { type: string }
 *               country_id: { type: integer }
 *               state_id: { type: string, format: uuid }
 *               city: { type: string }
 *               postal_code: { type: string }
 *               lat: { type: number, format: float }
 *               lng: { type: number, format: float }
 *               proof: { type: string }
 *               subscription_id: { type: string, format: uuid }
 *               no_of_users: { type: integer }
 *               subscription_startDate: { type: string, format: date }
 *               subscription_endDate: { type: string, format: date }
 *               subscription_amountPerUser: { type: number, format: float }
 *               remarks: { type: string }
 *               theme_color: { type: string }
 *               status: { type: boolean }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 company_id: { type: string, format: uuid }
 *                 logo: { type: string }
 *                 name: { type: string }
 *                 gst: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 address_1: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 city: { type: string }
 *                 postal_code: { type: string }
 *                 lat: { type: number, format: float }
 *                 lng: { type: number, format: float }
 *                 proof: { type: string }
 *                 subscription_id: { type: string, format: uuid }
 *                 no_of_users: { type: integer }
 *                 subscription_startDate: { type: string, format: date-time }
 *                 subscription_endDate: { type: string, format: date-time }
 *                 subscription_amountPerUser: { type: number, format: float }
 *                 remarks: { type: string }
 *                 theme_color: { type: string }
 *                 status: { type: boolean }
 *       400: { description: Validation error }
 *       403: { description: Permission denied }
 *       404: { description: Not found }
 *       409: { description: Conflict (duplicate email/phone) }
 *   delete:
 *     tags: [Administration]
 *     summary: Delete company
 *     description: Super admin only.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted } }
 */

/**
 * @swagger
 * /admin/vendors:
 *   get:
 *     tags: [Administration]
 *     summary: List vendors
 *     description: |
 *       Org-scoped. Supports pagination, sorting, fuzzy search, and exact filters.
 *       **Query examples:** `?searchParam=john&company_id=<uuid>&state_id=<uuid>&region_id=<uuid>`
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: searchParam, schema: { type: string }, description: Fuzzy search on vendor_name,email,phone }
 *       - { in: query, name: sortBy, schema: { type: string } }
 *       - { in: query, name: order, schema: { type: string, enum: [ASC, DESC] } }
 *       - { in: query, name: company_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: country_id, schema: { type: integer }, description: Exact filter }
 *       - { in: query, name: state_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: region_id, schema: { type: string, format: uuid }, description: Exact filter }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Administration]
 *     summary: Create vendor
 *     description: company_id required (auto-filled from token for non-super admin).
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendor_name, email, phone, password]
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: "Required for super_admin; ignored for org users"
 *               vendor_name: { type: string, example: "Ram Kumar" }
 *               photo: { type: string, example: "https://cdn.example.com/p/ram.jpg" }
 *               email: { type: string, format: email, example: "ram.kumar@example.com" }
 *               phone: { type: string, example: "9876543210" }
 *               password: { type: string, example: "StrongP@ssw0rd" }
 *               country_id: { type: integer, example: 91 }
 *               state_id: { type: string, format: uuid, example: "c8bb5a9c-02b0-4f91-8a41-2f5c1c0f9abc" }
 *               region: { type: string, example: "West" }
 *               region_id: { type: string, format: uuid, example: "7c2f5b6e-9a12-4d34-8f54-1a2b3c4d5e6f" }
 *               postal_code: { type: string, example: "400001" }
 *               role_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendor_id: { type: string, format: uuid }
 *                 company_id: { type: string, format: uuid }
 *                 vendor_name: { type: string }
 *                 photo: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 region: { type: string }
 *                 region_id: { type: string, format: uuid }
 *                 postal_code: { type: string }
 *                 role_id: { type: string, format: uuid }
 *       400: { description: Validation/tenant error }
 *       403: { description: Permission denied }
 *       409: { description: Conflict (duplicate email/phone per company) }
 * /admin/vendors/{id}:
 *   get:
 *     tags: [Administration]
 *     summary: Get vendor by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK } }
 *   put:
 *     tags: [Administration]
 *     summary: Update vendor
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendor_name: { type: string }
 *               photo: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, description: "If set, will be hashed" }
 *               country_id: { type: integer }
 *               state_id: { type: string, format: uuid }
 *               region: { type: string }
 *               region_id: { type: string, format: uuid }
 *               postal_code: { type: string }
 *               role_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendor_id: { type: string, format: uuid }
 *                 company_id: { type: string, format: uuid }
 *                 vendor_name: { type: string }
 *                 photo: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 region: { type: string }
 *                 region_id: { type: string, format: uuid }
 *                 postal_code: { type: string }
 *                 role_id: { type: string, format: uuid }
 *       400: { description: Validation/tenant error }
 *       403: { description: Permission denied }
 *       404: { description: Not found }
 *       409: { description: Conflict (duplicate email/phone per company) }
 *   delete:
 *     tags: [Administration]
 *     summary: Delete vendor
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted } }
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Administration]
 *     summary: List users (only Supervisor & Technician)
 *     description: |
 *       Org-scoped. Always restricted to roles **supervisor** and **technician**.
 *       Supports pagination, sorting, fuzzy search, and exact filters.
 *       **Query examples:** `?page=1&limit=10&searchParam=ram&vendor_id=<uuid>`
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: searchParam, schema: { type: string }, description: Fuzzy search on name,email,phone,city }
 *       - { in: query, name: sortBy, schema: { type: string } }
 *       - { in: query, name: order, schema: { type: string, enum: [ASC, DESC] } }
 *       - { in: query, name: company_id, schema: { type: string, format: uuid }, description: Exact filter (super admin only) }
 *       - { in: query, name: role_id, schema: { type: string, format: uuid }, description: Exact filter (must be supervisor or technician) }
 *       - { in: query, name: vendor_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: shift_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: region_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: supervisor_id, schema: { type: string, format: uuid }, description: Exact filter }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Administration]
 *     summary: Create user
 *     description: |
 *       Org-scoped. `company_id` is required (auto-filled for non-super admin).
 *       If role is **technician** or **supervisor**, `vendor_id` is required and must belong to the same company.
 *       If role is **technician**, `supervisor_id` is also required and must belong to the same company (with supervisor role).
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password, role_id]
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: "Required for super_admin; ignored for org users"
 *               role_id: { type: string, format: uuid, description: "Must be 'supervisor' or 'technician' role" }
 *               vendor_id: { type: string, format: uuid, description: "Required when role is supervisor/technician" }
 *               name: { type: string, example: "Asha Singh" }
 *               email: { type: string, format: email, example: "asha.singh@example.com" }
 *               phone: { type: string, example: "9876543210" }
 *               password: { type: string, example: "StrongP@ssw0rd" }
 *               photo: { type: string }
 *               emergency_contact: { type: string }
 *               address_1: { type: string }
 *               country_id: { type: integer }
 *               state_id: { type: string, format: uuid }
 *               city: { type: string }
 *               postal_code: { type: string }
 *               region_ids: { type: array, items: { type: string, format: uuid } }
 *               supervisor_id: { type: string, format: uuid }
 *               region_id: { type: string, format: uuid }
 *               shift_id: { type: string, format: uuid }
 *               proof: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id: { type: string, format: uuid }
 *                 company_id: { type: string, format: uuid }
 *                 role_id: { type: string, format: uuid }
 *                 vendor_id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 photo: { type: string }
 *                 emergency_contact: { type: string }
 *                 address_1: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 city: { type: string }
 *                 postal_code: { type: string }
 *                 region_ids: { type: array, items: { type: string, format: uuid } }
 *                 supervisor_id: { type: string, format: uuid }
 *                 region_id: { type: string, format: uuid }
 *                 shift_id: { type: string, format: uuid }
 *                 proof: { type: string }
 *       400: { description: Validation/tenant error }
 *       403: { description: Permission denied }
 *       409: { description: Conflict (duplicate email/phone) }
 * /admin/users/{id}:
 *   get:
 *     tags: [Administration]
 *     summary: Get user by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK } }
 *   put:
 *     tags: [Administration]
 *     summary: Update user
 *     description: |
 *       Org-scoped. Cannot change `company_id`. If changing role to supervisor/technician, `vendor_id` must be provided and belong to the same company.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_id: { type: string, format: uuid }
 *               vendor_id: { type: string, format: uuid }
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, description: "If set, will be hashed" }
 *               photo: { type: string }
 *               emergency_contact: { type: string }
 *               address_1: { type: string }
 *               country_id: { type: integer }
 *               state_id: { type: string, format: uuid }
 *               city: { type: string }
 *               postal_code: { type: string }
 *               region_ids: { type: array, items: { type: string, format: uuid } }
 *               supervisor_id: { type: string, format: uuid }
 *               region_id: { type: string, format: uuid }
 *               shift_id: { type: string, format: uuid }
 *               proof: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id: { type: string, format: uuid }
 *                 company_id: { type: string, format: uuid }
 *                 role_id: { type: string, format: uuid }
 *                 vendor_id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 photo: { type: string }
 *                 emergency_contact: { type: string }
 *                 address_1: { type: string }
 *                 country_id: { type: integer }
 *                 state_id: { type: string, format: uuid }
 *                 city: { type: string }
 *                 postal_code: { type: string }
 *                 region_ids: { type: array, items: { type: string, format: uuid } }
 *                 supervisor_id: { type: string, format: uuid }
 *                 region_id: { type: string, format: uuid }
 *                 shift_id: { type: string, format: uuid }
 *                 proof: { type: string }
 *       400: { description: Validation/tenant error }
 *       403: { description: Permission denied }
 *       404: { description: Not found }
 *       409: { description: Conflict (duplicate email/phone) }
 *   delete:
 *     tags: [Administration]
 *     summary: Delete user
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted } }
 */

/**
 * @swagger
 * /admin/clients:
 *   get:
 *     tags: [Administration]
 *     summary: List clients
 *     description: |
 *       Org-scoped. Supports pagination, sorting, fuzzy search, and exact filters.
 *       **Query examples:** `?searchParam=anand&available_status=true`
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: searchParam, schema: { type: string }, description: Fuzzy search on firstName,lastName,email,phone,city }
 *       - { in: query, name: sortBy, schema: { type: string } }
 *       - { in: query, name: order, schema: { type: string, enum: [ASC, DESC] } }
 *       - { in: query, name: company_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: business_typeId, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: country_id, schema: { type: integer }, description: Exact filter }
 *       - { in: query, name: state_id, schema: { type: string, format: uuid }, description: Exact filter }
 *       - { in: query, name: available_status, schema: { type: boolean }, description: Exact filter }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Administration]
 *     summary: Create client
 *     description: company_id required (auto-filled from token for non-super admin).
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses: { 201: { description: Created } }
 * /admin/clients/{id}:
 *   get:
 *     tags: [Administration]
 *     summary: Get client by ID
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: OK } }
 *   put:
 *     tags: [Administration]
 *     summary: Update client
 *     description: Org-scoped. Cannot change `company_id`.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Administration]
 *     summary: Delete client
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string, format: uuid } } ]
 *     responses: { 200: { description: Deleted } }
 */

/* ========================= JOBS ========================= */
/**
 * @swagger
 * /jobs:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: List jobs (filters, sorting, pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchParam
 *         schema: { type: string }
 *         description: Fuzzy search on reference_number.
 *       - in: query
 *         name: client_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: worktype_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: jobtype_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: supervisor_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: technician_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: now_id
 *         schema: { type: string, format: uuid }
 *         description: Nature of work ID
 *       - in: query
 *         name: job_status_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Include jobs with scheduledDateAndTime >= from (ISO 8601)
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Include jobs with scheduledDateAndTime <= to (ISO 8601)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, example: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Create job
 *     description: >
 *       - Non-super admins are auto-scoped to their company_id.
 *       - Requires assigning both a technician and a supervisor.
 *       - reference_number is auto-generated if omitted.
 *       - Accepts estimated duration as days/hours/minutes. Backend also stores total minutes in estimated_duration.
 *       - A JobStatusHistory row is created if job_status_id is provided.
 *       - Optional job_photo image uploads use multipart/form-data; sending an empty value (or the remove flag) clears the stored photo.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_id, supervisor_id, technician_id]
 *             properties:
 *               client_id: { type: string, format: uuid }
 *               worktype_id: { type: string, format: uuid }
 *               jobtype_id: { type: string, format: uuid }
 *               supervisor_id: { type: string, format: uuid }
 *               technician_id: { type: string, format: uuid }
 *               now_id: { type: string, format: uuid }
 *               job_status_id: { type: string, format: uuid }
 *               estimated_days: { type: integer, minimum: 0, example: 0 }
 *               estimated_hours: { type: integer, minimum: 0, maximum: 23, example: 2 }
 *               estimated_minutes: { type: integer, minimum: 0, maximum: 59, example: 30 }
 *               estimated_duration: { type: integer, description: Total minutes (optional; computed if days/hours/minutes provided), example: 150 }
 *               scheduledDateAndTime: { type: string, format: date-time }
 *               reference_number: { type: string }
 *               job_description: { type: string }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [client_id, supervisor_id, technician_id]
 *             properties:
 *               client_id: { type: string, format: uuid }
 *               worktype_id: { type: string, format: uuid }
 *               jobtype_id: { type: string, format: uuid }
 *               supervisor_id: { type: string, format: uuid }
 *               technician_id: { type: string, format: uuid }
 *               now_id: { type: string, format: uuid }
 *               job_status_id: { type: string, format: uuid }
 *               estimated_days: { type: integer, minimum: 0 }
 *               estimated_hours: { type: integer, minimum: 0, maximum: 23 }
 *               estimated_minutes: { type: integer, minimum: 0, maximum: 59 }
 *               estimated_duration: { type: integer, description: Total minutes (optional; computed if days/hours/minutes provided) }
 *               scheduledDateAndTime: { type: string, format: date-time }
 *               reference_number: { type: string }
 *               job_description: { type: string }
 *               job_photo:
 *                 type: string
 *                 format: binary
 *                 description: Image (jpeg/png/webp/etc.) stored on S3 for the job card
 *               remove_job_photo:
 *                 type: string
 *                 description: Optional flag ("true"/"1"/"remove") to clear a previously stored photo
 *           examples:
 *             basic:
 *               value:
 *                 client_id: "b4b3b9a1-0a8c-4a59-9a68-96c8f0d8e1aa"
 *                 worktype_id: "2f2e5a10-6b1e-4bff-bb79-7e0f2c8b43e1"
 *                 jobtype_id: "e7a02d7f-0d2c-4d1b-9b88-a9a5b1f0a1c2"
 *                 now_id: "d3a3f9a1-3b2c-4c5d-8e7f-1a2b3c4d5e6f"
 *                 job_status_id: "f1550a6d-9f7b-49d0-b3a5-1a3d2f4b5c6e"
 *                 estimated_days: 0
 *                 estimated_hours: 2
 *                 estimated_minutes: 30
 *                 estimated_duration: 150
 *                 scheduledDateAndTime: "2025-08-20T10:30:00.000Z"
 *                 job_description: "AC not cooling — Check filter and gas level"
 *     responses:
 *       201: { description: Created }
 * /jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get job (single object with embedded status_history)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job_id:
 *                   type: string
 *                   format: uuid
 *                   example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *                   description: Job identifier (UUID)
 *                 client: { type: object }
 *                 technician: { type: object, description: Password excluded }
 *                 supervisor: { type: object, description: Password excluded }
 *                 work_type: { type: object }
 *                 job_type: { type: object }
 *                 nature_of_work: { type: object }
 *                 job_status: { type: object }
 *                 status_history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       job_status_id: { type: string, format: uuid }
 *                       job_status_title: { type: string }
 *                       job_status_color_code: { type: string }
 *                       is_completed: { type: boolean }
 *                       at: { type: string, format: date-time }
 *                 chats:
 *                   type: array
 *                   description: Chronological messages attached to this job
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       user_id: { type: string, format: uuid }
 *                       user_name: { type: string, nullable: true }
 *                       user_photo: { type: string, nullable: true }
 *                       message: { type: string }
 *                       sent_at: { type: string, format: date-time }
 *                 attachments:
 *                   type: array
 *                   description: Files uploaded for this job
 *                   items:
 *                     type: object
 *                     properties:
 *                       attachment_id: { type: string, format: uuid }
 *                       file_name: { type: string }
 *                       content_type: { type: string, nullable: true }
 *                       file_size: { type: integer, nullable: true }
 *                       url: { type: string }
 *                       s3_key: { type: string, nullable: true }
 *                       uploaded_by: { type: string, format: uuid, nullable: true }
 *                       uploaded_at: { type: string, format: date-time }
 *                       remark: { type: string, nullable: true }
 *                       uploader:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           user_id: { type: string, format: uuid }
 *                           name: { type: string, nullable: true }
 *                           photo: { type: string, nullable: true }
 *   put:
 *     tags: [Jobs]
 *     summary: Update job (tracks status changes)
 *     description: >
 *       - If job_status_id changes, a new JobStatusHistory row is created.
 *       - Supports multipart/form-data uploads for job_photo (image) and remove_job_photo flag to clear it.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               job_photo:
 *                 type: string
 *                 format: binary
 *                 description: Image (jpeg/png/webp/etc.) stored on S3 for the job
 *               remove_job_photo:
 *                 type: string
 *                 description: Optional flag ("true"/"1"/"remove") to clear the existing image
 *     responses:
 *       200: { description: OK }
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete job
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     responses:
 *       200: { description: Deleted }
 * /jobs/{id}/attachments:
 *   get:
 *     tags: [Jobs]
 *     summary: List attachments for a job
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   attachment_id: { type: string, format: uuid }
 *                   file_name: { type: string }
 *                   content_type: { type: string, nullable: true }
 *                   file_size: { type: integer, nullable: true }
 *                   url: { type: string }
 *                   s3_key: { type: string, nullable: true }
 *                   uploaded_by: { type: string, format: uuid, nullable: true }
 *                   uploaded_at: { type: string, format: date-time }
 *                   remark: { type: string, nullable: true }
 *                   uploader:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       user_id: { type: string, format: uuid }
 *                       name: { type: string, nullable: true }
 *                       photo: { type: string, nullable: true }
 *   post:
 *     tags: [Jobs]
 *     summary: Upload attachments for a job
 *     description: >
 *       Accepts up to 3 files per request. Each file must be 10 MB or smaller (values controlled by the
 *       JOB_ATTACHMENT_MAX_FILES and JOB_ATTACHMENT_MAX_BYTES environment variables).
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 description: One or more files to attach (max 3, 10 MB each)
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   attachment_id: { type: string, format: uuid }
 *                   file_name: { type: string }
 *                   content_type: { type: string, nullable: true }
 *                   file_size: { type: integer, nullable: true }
 *                   url: { type: string }
 *                   s3_key: { type: string, nullable: true }
 *                   uploaded_by: { type: string, format: uuid, nullable: true }
 *                   uploaded_at: { type: string, format: date-time }
 *                   remark: { type: string, nullable: true }
 *                   uploader:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       user_id: { type: string, format: uuid }
 *                       name: { type: string, nullable: true }
 *                       photo: { type: string, nullable: true }
 *       400: { description: Invalid upload payload }
 *       404: { description: Job not found }
 * /jobs/{id}/attachments/{attachmentId}:
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete a job attachment
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "2c1b1cf4-0b2a-4e01-9c34-8d4fbded2dd2"
 *           description: Attachment identifier
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Attachment not found }
* /jobs/{id}/chats:
 *   get:
 *     tags: [Jobs]
 *     summary: List chat messages for a job
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   user_id: { type: string, format: uuid }
 *                   user_name: { type: string, nullable: true }
 *                   user_photo: { type: string, nullable: true }
 *                   message: { type: string }
 *                   sent_at: { type: string, format: date-time }
 *   post:
 *     tags: [Jobs]
 *     summary: Append a chat message to a job
 *     description: Message length is limited to 2000 characters.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "7bde3b8d-1234-4fcd-8123-5a6b7c8d9e10"
 *           description: Job identifier (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 example: Technician en route to site.
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       404: { description: Job not found }
 *
 *       200: { description: Deleted }
 */

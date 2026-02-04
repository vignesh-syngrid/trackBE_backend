/**
 * @openapi
 * components:
 *   schemas:
 *     UploadResult:
 *       type: object
 *       properties:
 *         bucket:
 *           type: string
 *         key:
 *           type: string
 *         url:
 *           type: string
 *           format: uri
 *         contentType:
 *           type: string
 *     Attendance:
 *       type: object
 *       properties:
 *         attendance_id:
 *           type: string
 *           format: uuid
 *         company_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         mode:
 *           type: string
 *           enum: [bike, bus]
 *         check_in_at:
 *           type: string
 *           format: date-time
 *         check_in_km:
 *           type: integer
 *           nullable: true
 *         check_in_photo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         check_out_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         check_out_km:
 *           type: integer
 *           nullable: true
 *         check_out_photo_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *         total_minutes:
 *           type: integer
 *           nullable: true
 */


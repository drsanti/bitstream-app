/*******************************************************************************
 * File Name 	: mag_driver.c
 *
 * Description 	: I2C driver for magnetometer (BMM150 or BMM350) on the same
 *                bus as the IMU. Supports BMM350 (e.g. CY8CKIT-062S2-AI) and
 *                BMM150. Call mag_init() with the shared I2C handle after
 *                the IMU driver has initialized the bus.
 *
 * Author      	: Asst.Prof.Santi Nuratch, Ph.D
 *                INC AUTOMATION
 *                Department of Control Systems and Instrumentation Engineering
 *				  King Mongkut's University of Technology Thonburi (KMUTT)
 *
 * Version     	: 1.0
 * Date         : 17 March 2026
 * Target       : CY8CKIT-062S2-AI PSoC™ 6 AI Evaluation Board
 *
 *******************************************************************************/

#include "mag_driver.h"
#include "i2c_driver.h"
#include "sensors_config.h"
#include "cyhal.h"
#include "cy_retarget_io.h"
#include "FreeRTOS.h"
#include "task.h"

/* Bosch BMM350 SensorAPI (in shared mtb_shared). We include via relative path
 * so both the build system and IDE tooling can resolve it reliably.
 */
#include "../../../mtb_shared/BMM350_SensorAPI/v1.4.0/bmm350.h"

/*******************************************************************************
* Common
********************************************************************************/
#define I2C_TIMEOUT_MS (50u)

/*******************************************************************************
* BMM150
********************************************************************************/
#define BMM150_REG_CHIP_ID    (0x40u)
#define BMM150_CHIP_ID_VAL    (0x32u)
#define BMM150_REG_PWR_CTRL   (0x4Bu)
#define BMM150_PWR_NORMAL     (0x01u)
#define BMM150_REG_DATA_X_LSB (0x42u)
#define BMM150_XY_LSB_UT      (0.3f)
#define BMM150_Z_LSB_UT       (0.1f)

/* Magnetometer chip selection */
typedef enum { MAG_CHIP_NONE = 0, MAG_CHIP_BMM150, MAG_CHIP_BMM350 } mag_chip_t;

/*******************************************************************************
* Static variables
********************************************************************************/
static cyhal_i2c_t *i2c_ptr = NULL;
static uint8_t mag_i2c_addr = MAG_I2C_ADDR;
static int mag_present = 0;
static mag_chip_t mag_chip = MAG_CHIP_NONE;

typedef struct {
    cyhal_i2c_t *i2c;
    uint8_t addr;
} bmm350_i2c_ctx_t;

static struct bmm350_dev bmm350_dev_obj;
static bmm350_i2c_ctx_t bmm350_ctx;

/*******************************************************************************
* Static helpers
********************************************************************************/
static cy_rslt_t mag_reg_write(uint8_t reg, uint8_t val)
{
    cy_rslt_t result;
    uint8_t buf[2] = { reg, val };
    if (i2c_ptr == NULL)
        return CY_RSLT_TYPE_ERROR;
    i2c_lock();
    result = cyhal_i2c_master_write(i2c_ptr, (uint16_t)mag_i2c_addr, buf, 2u, I2C_TIMEOUT_MS, true);
    i2c_unlock();
    return result;
}

static cy_rslt_t mag_reg_read(uint8_t reg, uint8_t *data, uint16_t len)
{
    cy_rslt_t result;
    if (i2c_ptr == NULL)
        return CY_RSLT_TYPE_ERROR;
    i2c_lock();
    result = cyhal_i2c_master_mem_read(i2c_ptr, (uint16_t)mag_i2c_addr, (uint16_t)reg, 1u, data, len, I2C_TIMEOUT_MS);
    i2c_unlock();
    return result;
}

static BMM350_INTF_RET_TYPE bmm350_i2c_read(uint8_t reg_addr, uint8_t *reg_data, uint32_t len, void *intf_ptr)
{
    if (reg_data == NULL || len == 0u || intf_ptr == NULL)
        return (BMM350_INTF_RET_TYPE)-1;

    bmm350_i2c_ctx_t *ctx = (bmm350_i2c_ctx_t *)intf_ptr;
    if (ctx->i2c == NULL)
        return (BMM350_INTF_RET_TYPE)-1;

    i2c_lock();
    cy_rslt_t r = cyhal_i2c_master_mem_read(ctx->i2c, (uint16_t)ctx->addr, (uint16_t)reg_addr, 1u,
                                            reg_data, (uint16_t)len, I2C_TIMEOUT_MS);
    i2c_unlock();
    return (r == CY_RSLT_SUCCESS) ? (BMM350_INTF_RET_TYPE)0 : (BMM350_INTF_RET_TYPE)-1;
}

static BMM350_INTF_RET_TYPE bmm350_i2c_write(uint8_t reg_addr, const uint8_t *reg_data, uint32_t len, void *intf_ptr)
{
    if (reg_data == NULL || len == 0u || intf_ptr == NULL)
        return (BMM350_INTF_RET_TYPE)-1;

    bmm350_i2c_ctx_t *ctx = (bmm350_i2c_ctx_t *)intf_ptr;
    if (ctx->i2c == NULL)
        return (BMM350_INTF_RET_TYPE)-1;

    i2c_lock();
    cy_rslt_t r = cyhal_i2c_master_mem_write(ctx->i2c, (uint16_t)ctx->addr, (uint16_t)reg_addr, 1u,
                                             reg_data, (uint16_t)len, I2C_TIMEOUT_MS);
    i2c_unlock();
    return (r == CY_RSLT_SUCCESS) ? (BMM350_INTF_RET_TYPE)0 : (BMM350_INTF_RET_TYPE)-1;
}

static void bmm350_platform_delay_us(uint32_t period, void *intf_ptr)
{
    (void)intf_ptr;
    cyhal_system_delay_us(period);
}

/******************************************************************************
 * Function Name: mag_init
 ******************************************************************************/
int mag_init(cyhal_i2c_t *i2c)
{
    cy_rslt_t result;

    if (i2c == NULL)
        return -1;

    i2c_ptr = i2c;
    mag_present = 0;
    mag_chip = MAG_CHIP_NONE;

    /* Prefer BMM350 on this kit (I2C address typically 0x15, sometimes 0x14). */
    static const uint8_t bmm350_addrs[] = { 0x15u, 0x14u };
    for (unsigned ai = 0; ai < (sizeof(bmm350_addrs) / sizeof(bmm350_addrs[0])) && !mag_present; ai++) {
        bmm350_ctx.i2c = i2c_ptr;
        bmm350_ctx.addr = bmm350_addrs[ai];

        memset(&bmm350_dev_obj, 0, sizeof(bmm350_dev_obj));
        bmm350_dev_obj.intf_ptr = &bmm350_ctx;
        bmm350_dev_obj.read = bmm350_i2c_read;
        bmm350_dev_obj.write = bmm350_i2c_write;
        bmm350_dev_obj.delay_us = bmm350_platform_delay_us;
        bmm350_dev_obj.mraw_override = NULL;

        /* Let the device finish POR before init. */
        bmm350_dev_obj.delay_us(BMM350_START_UP_TIME_FROM_POR, bmm350_dev_obj.intf_ptr);

        int8_t rslt = bmm350_init(&bmm350_dev_obj);
        if (rslt == BMM350_OK) {
            (void)bmm350_set_odr_performance(BMM350_DATA_RATE_25HZ, BMM350_AVERAGING_8, &bmm350_dev_obj);
            (void)bmm350_enable_axes(BMM350_X_EN, BMM350_Y_EN, BMM350_Z_EN, &bmm350_dev_obj);
            (void)bmm350_set_powermode(BMM350_NORMAL_MODE, &bmm350_dev_obj);

            mag_present = 1;
            mag_chip = MAG_CHIP_BMM350;
            mag_i2c_addr = bmm350_ctx.addr;
            printf("MAG: BMM350 initialized at 0x%02X (chip_id=0x%02X)\n",
                   (unsigned)mag_i2c_addr, (unsigned)bmm350_dev_obj.chip_id);
            break;
        }
    }

    /* Optional fallback: BMM150 at 0x10/0x11 */
    if (!mag_present) {
        static const uint8_t bmm150_addrs[] = { 0x10u, 0x11u };
        for (unsigned ai = 0; ai < (sizeof(bmm150_addrs) / sizeof(bmm150_addrs[0])) && !mag_present; ai++) {
            uint8_t mag_id;
            mag_i2c_addr = bmm150_addrs[ai];
            (void)mag_reg_write(BMM150_REG_PWR_CTRL, BMM150_PWR_NORMAL);
            vTaskDelay(pdMS_TO_TICKS(10u));
            result = mag_reg_read(BMM150_REG_CHIP_ID, &mag_id, 1u);
            if (result == CY_RSLT_SUCCESS && mag_id == BMM150_CHIP_ID_VAL) {
                mag_present = 1;
                mag_chip = MAG_CHIP_BMM150;
                printf("MAG: BMM150 detected at 0x%02X (CHIP_ID=0x%02X)\n",
                       (unsigned)mag_i2c_addr, (unsigned)mag_id);
                break;
            }
        }
    }

    if (!mag_present) {
        printf("MAG: No magnetometer detected (BMM350 @0x14/0x15, BMM150 @0x10/0x11)\n");
    }

    return mag_present ? 0 : -1;
}

/******************************************************************************
 * Function Name: mag_available
 ******************************************************************************/
int mag_available(void)
{
    return mag_present;
}

/******************************************************************************
 * Function Name: mag_read
 ******************************************************************************/
int mag_read(mag_data_t *out)
{
    if (out == NULL || !mag_present || i2c_ptr == NULL)
        return -1;

    if (mag_chip == MAG_CHIP_BMM350) {
        struct bmm350_mag_temp_data mag_temp;
        int8_t rslt = bmm350_get_compensated_mag_xyz_temp_data(&mag_temp, &bmm350_dev_obj);
        if (rslt != BMM350_OK)
            return (int)rslt;
        out->mag_x = mag_temp.x;
        out->mag_y = mag_temp.y;
        out->mag_z = mag_temp.z;
        out->temperature_c = mag_temp.temperature;
        out->temp_valid = 1;
        return 0;
    }

    /* BMM150 */
    cy_rslt_t result;
    uint8_t buf[6];
    int16_t x_raw, y_raw, z_raw;
    result = mag_reg_read(BMM150_REG_DATA_X_LSB, buf, 6u);
    if (result != CY_RSLT_SUCCESS)
        return (int)result;
    x_raw = (int16_t)((uint16_t)buf[1] << 5 | (uint16_t)buf[0] >> 3);
    if (x_raw & 0x1000)
        x_raw -= 8192;
    y_raw = (int16_t)((uint16_t)buf[3] << 5 | (uint16_t)buf[2] >> 3);
    if (y_raw & 0x1000)
        y_raw -= 8192;
    z_raw = (int16_t)((uint16_t)buf[5] << 3 | (uint16_t)buf[4] >> 5);
    if (z_raw & 0x4000)
        z_raw -= 16384;
    out->mag_x = (float)x_raw * BMM150_XY_LSB_UT;
    out->mag_y = (float)y_raw * BMM150_XY_LSB_UT;
    out->mag_z = (float)z_raw * BMM150_Z_LSB_UT;
    out->temp_valid = 0;
    return 0;
}

/******************************************************************************
 * Function Name: mag_model_name
 ******************************************************************************/
const char *mag_model_name(void)
{
    if (!mag_present) {
        return "none";
    }
    switch (mag_chip) {
    case MAG_CHIP_BMM150:
        return "BMM150";
    case MAG_CHIP_BMM350:
        return "BMM350";
    default:
        return "unknown";
    }
}

/* [] END OF FILE */

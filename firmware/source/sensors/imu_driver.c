/*******************************************************************************
 * File Name 	: imu_driver.c
 *
 * Description 	: I2C driver for IMU (accelerometer + gyroscope). Supports
 *                ICM-20948 (WHO_AM_I=0xEA) and BMI270 (WHO_AM_I=0x24).
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

#include "imu_driver.h"
#include "i2c_driver.h"
#include "sensors_config.h"
#include "bmi270_config_file.h"
#include "cyhal.h"
#include "cy_retarget_io.h"
#include "cybsp.h"
#include <string.h>

/*******************************************************************************
* Common
********************************************************************************/
#define DEG_TO_RAD               (0.01745329252f)
#define I2C_TIMEOUT_MS           (50u)

/*******************************************************************************
* ICM-20948 (Bank 0)
********************************************************************************/
#define ICM20948_REG_BANK_SEL     (0x7Fu)
#define ICM20948_REG_WHO_AM_I     (0x00u)
#define ICM20948_WHO_AM_I_VAL     (0xEAu)
#define ICM20948_REG_PWR_MGMT_1   (0x06u)
#define ICM20948_REG_PWR_MGMT_2   (0x07u)
#define ICM20948_REG_ACCEL_XOUT_H (0x2Du)
#define ICM20948_REG_GYRO_XOUT_H  (0x33u)
#define ICM20948_BANK_0           (0x00u)
#define ICM20948_WAKE             (0x01u)
#define ICM20948_ENABLE_ALL_AXES  (0x00u)
#define ICM20948_ACCEL_LSB_G      (8192.0f)   /* ±16g */
#define ICM20948_GYRO_LSB_DPS     (16.4f)     /* ±2000 dps */

/*******************************************************************************
* BMI270 (Bosch)
********************************************************************************/
#define BMI270_REG_CHIP_ID        (0x00u)
#define BMI270_CHIP_ID_VAL        (0x24u)
#define BMI270_REG_ACC_X_LSB      (0x0Cu)    /* 6 bytes accel */
#define BMI270_REG_GYR_X_LSB      (0x12u)    /* 6 bytes gyro */
#define BMI270_REG_PWR_CONF       (0x7Cu)
#define BMI270_REG_PWR_CTRL       (0x7Du)
#define BMI270_REG_CMD            (0x7Eu)
#define BMI270_REG_INIT_CTRL      (0x59u)
#define BMI270_REG_INIT_ADDR_0    (0x5Bu)
#define BMI270_REG_INIT_DATA      (0x5Eu)
#define BMI270_REG_INTERNAL_STATUS (0x21u)
#define BMI270_ACC_EN             (0x04u)
#define BMI270_GYR_EN             (0x02u)
#define BMI270_TEMP_EN            (0x08u)
#define BMI270_CMD_SOFTRESET      (0xB6u)
#define BMI270_PREPARE_CONFIG_LOAD  (0x00u)
#define BMI270_COMPLETE_CONFIG_LOAD (0x01u)
#define BMI270_INST_MESSAGE_MSK     (0x0Fu)
#define BMI270_INST_MESSAGE_INIT_OK (0x01u)
#define BMI270_WR_LEN               (32u)
#define BMI270_ACCEL_LSB_G        (16384.0f) /* ±2g default */
#define BMI270_GYRO_LSB_DPS       (16.4f)    /* ±2000 dps */
#define BMI270_REG_TEMP           (0x22u)    /* temperature LSB (2 bytes) */
#define BMI270_TEMP_OFFSET_C      (23.0f)
#define BMI270_TEMP_SCALE         (512.0f)   /* °C = offset + raw / scale */

/*******************************************************************************
* Static variables
********************************************************************************/
static cyhal_i2c_t *i2c_ptr = NULL;
static uint8_t imu_i2c_addr = IMU_I2C_ADDR;

typedef enum { IMU_CHIP_NONE = 0, IMU_CHIP_ICM20948, IMU_CHIP_BMI270 } imu_chip_t;
static imu_chip_t imu_chip = IMU_CHIP_NONE;

/*******************************************************************************
* Static helpers
********************************************************************************/
static cy_rslt_t imu_reg_write(uint8_t reg, uint8_t val)
{
    cy_rslt_t result;
    uint8_t buf[2] = { reg, val };
    if (i2c_ptr == NULL)
        return CY_RSLT_TYPE_ERROR;
    i2c_lock();
    result = cyhal_i2c_master_write(i2c_ptr, (uint16_t)imu_i2c_addr, buf, 2u, I2C_TIMEOUT_MS, true);
    i2c_unlock();
    return result;
}

static cy_rslt_t imu_reg_read(uint8_t reg, uint8_t *data, uint16_t len)
{
    cy_rslt_t result;
    if (i2c_ptr == NULL)
        return CY_RSLT_TYPE_ERROR;
    i2c_lock();
    result = cyhal_i2c_master_mem_read(i2c_ptr, (uint16_t)imu_i2c_addr, (uint16_t)reg, 1u, data, len, I2C_TIMEOUT_MS);
    i2c_unlock();
    return result;
}

static cy_rslt_t bmi270_write_config_file(const uint8_t *cfg, uint16_t cfg_len)
{
    cy_rslt_t result;
    uint16_t index = 0;
    uint8_t addr_array[2];

    while (index < cfg_len) {
        uint16_t chunk = (uint16_t)((cfg_len - index) > BMI270_WR_LEN ? BMI270_WR_LEN : (cfg_len - index));

        /* Address is in "words" (index/2) as per Bosch API / Zephyr driver */
        uint16_t addr = (uint16_t)(index / 2u);
        addr_array[0] = (uint8_t)(addr & 0x0Fu);
        addr_array[1] = (uint8_t)(addr >> 4);

        result = imu_reg_write(BMI270_REG_INIT_ADDR_0, addr_array[0]);
        if (result != CY_RSLT_SUCCESS)
            return result;
        result = imu_reg_write((uint8_t)(BMI270_REG_INIT_ADDR_0 + 1u), addr_array[1]);
        if (result != CY_RSLT_SUCCESS)
            return result;

        /* Write chunk bytes to INIT_DATA sequentially */
        i2c_lock();
        /* One I2C transaction: register + payload chunk */
        {
            uint8_t buf[BMI270_WR_LEN + 1u];
            buf[0] = BMI270_REG_INIT_DATA;
            (void)memcpy(&buf[1], &cfg[index], chunk);
            result = cyhal_i2c_master_write(i2c_ptr, (uint16_t)imu_i2c_addr, buf, (uint16_t)(chunk + 1u),
                                            I2C_TIMEOUT_MS, true);
        }
        i2c_unlock();

        if (result != CY_RSLT_SUCCESS)
            return result;

        cyhal_system_delay_us(1000u);
        index = (uint16_t)(index + chunk);
    }

    return CY_RSLT_SUCCESS;
}

/******************************************************************************
 * Function Name: imu_init
 ******************************************************************************/
int imu_init(cyhal_i2c_t *i2c)
{
    cy_rslt_t result;

    if (i2c == NULL)
        return -1;

    i2c_ptr = i2c;
    imu_chip = IMU_CHIP_NONE;

    /* Detect chip by WHO_AM_I / CHIP_ID at 0x00.
     * Many IMUs use 0x68 or 0x69 depending on AD0 strap, so probe both.
     */
    {
        uint8_t who = 0xFFu;
        uint8_t found_addr = 0u;
        cy_rslt_t last_err = CY_RSLT_SUCCESS;

        for (unsigned a = 0; a < 2u; a++) {
            imu_i2c_addr = (uint8_t)(0x68u + a);
            result = imu_reg_read(0x00u, &who, 1u);
            if (result == CY_RSLT_SUCCESS) {
                found_addr = imu_i2c_addr;
                break;
            }
            last_err = result;
        }

        if (found_addr == 0u) {
            printf("IMU: WHO_AM_I read failed at 0x68/0x69 (last 0x%08lX)\n",
                   (unsigned long)last_err);
            return (int)last_err;
        }

        /* Warn early if the ID byte looks like a floating bus. */
        if (who == 0x00u || who == 0xFFu) {
            printf("IMU: suspicious WHO_AM_I=0x%02X at 0x%02X (check wiring/address)\n",
                   (unsigned)who, (unsigned)found_addr);
        }

        if (who == BMI270_CHIP_ID_VAL) {
            imu_chip = IMU_CHIP_BMI270;

            /* BMI270 requires loading a feature configuration blob before
             * accel/gyro data become valid.
             */
            result = imu_reg_write(BMI270_REG_CMD, BMI270_CMD_SOFTRESET);
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 soft reset failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }
            cyhal_system_delay_ms(50u);

            /* Disable advanced power save so accel/gyro start producing data. */
            result = imu_reg_write(BMI270_REG_PWR_CONF, 0x00u);
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 PWR_CONF failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }
            cyhal_system_delay_ms(10u);

            /* Prepare config load */
            result = imu_reg_write(BMI270_REG_INIT_CTRL, BMI270_PREPARE_CONFIG_LOAD);
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 INIT_CTRL(prep) failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }

            result = bmi270_write_config_file(bmi270_config_file_max_fifo,
                                              (uint16_t)sizeof(bmi270_config_file_max_fifo));
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 config upload failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }

            /* Complete config load */
            result = imu_reg_write(BMI270_REG_INIT_CTRL, BMI270_COMPLETE_CONFIG_LOAD);
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 INIT_CTRL(done) failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }

            /* Poll internal status message for init OK */
            {
                uint8_t st = 0u;
                int ok = 0;
                for (unsigned tries = 0; tries < 30u; tries++) {
                    result = imu_reg_read(BMI270_REG_INTERNAL_STATUS, &st, 1u);
                    if (result != CY_RSLT_SUCCESS) {
                        printf("IMU: BMI270 INTERNAL_STATUS read failed 0x%08lX\n",
                               (unsigned long)result);
                        return (int)result;
                    }
                    if ( (st & BMI270_INST_MESSAGE_MSK) == BMI270_INST_MESSAGE_INIT_OK ) {
                        ok = 1;
                        break;
                    }
                    cyhal_system_delay_ms(10u);
                }
                if (!ok) {
                    printf("IMU: BMI270 init not OK (INTERNAL_STATUS=0x%02X)\n", (unsigned)st);
                    return -1;
                }
            }

            /* Enable accel, gyro, and temperature */
            result = imu_reg_write(BMI270_REG_PWR_CTRL, BMI270_ACC_EN | BMI270_GYR_EN | BMI270_TEMP_EN);
            if (result != CY_RSLT_SUCCESS) {
                printf("IMU: BMI270 PWR_CTRL failed 0x%08lX\n", (unsigned long)result);
                return (int)result;
            }
            cyhal_system_delay_ms(20u);
            printf("IMU: BMI270 detected at 0x%02X (CHIP_ID=0x%02X)\n", (unsigned)imu_i2c_addr, (unsigned)who);
            return 0;
        }
        if (who == ICM20948_WHO_AM_I_VAL) {
            imu_chip = IMU_CHIP_ICM20948;
        } else {
            printf("IMU: unknown WHO_AM_I=0x%02X (0xEA=ICM-20948, 0x24=BMI270)\n", who);
            return -1;
        }
    }

    /* ICM-20948: select bank 0 and wake */
    result = imu_reg_write(ICM20948_REG_BANK_SEL, ICM20948_BANK_0);
    if (result != CY_RSLT_SUCCESS) {
        printf("IMU: bank select failed 0x%08lX\n", (unsigned long)result);
        return (int)result;
    }
    result = imu_reg_write(ICM20948_REG_PWR_MGMT_1, ICM20948_WAKE);
    if (result != CY_RSLT_SUCCESS)
        return (int)result;
    /* Explicitly enable accel+gyro axes (some parts default to disable). */
    result = imu_reg_write(ICM20948_REG_PWR_MGMT_2, ICM20948_ENABLE_ALL_AXES);
    if (result != CY_RSLT_SUCCESS) {
        printf("IMU: PWR_MGMT_2 failed 0x%08lX\n", (unsigned long)result);
        return (int)result;
    }
    cyhal_system_delay_ms(20u);
    printf("IMU: ICM-20948 detected at 0x%02X (CHIP_ID=0x%02X)\n", (unsigned)imu_i2c_addr, (unsigned)ICM20948_WHO_AM_I_VAL);
    return 0;
}

/******************************************************************************
 * Function Name: imu_read_accel_gyro
 ******************************************************************************/
int imu_read_accel_gyro(imu_accel_gyro_t *out)
{
    cy_rslt_t result;
    uint8_t buf[12];
    int16_t ax, ay, az, gx, gy, gz;

    if (out == NULL || imu_chip == IMU_CHIP_NONE)
        return -1;

    if (imu_chip == IMU_CHIP_BMI270)
    {
        /* BMI270: accel at 0x0C (6 bytes LSB first), gyro at 0x12 (6 bytes LSB first) */
        result = imu_reg_read(BMI270_REG_ACC_X_LSB, buf, 6u);
        if (result != CY_RSLT_SUCCESS)
            return (int)result;
        {
            uint8_t orv = 0u, andv = 0xFFu;
            for (unsigned i = 0; i < 6u; i++) { orv |= buf[i]; andv &= buf[i]; }
            if (orv == 0u || andv == 0xFFu) {
                printf("IMU: warning BMI270 accel raw looks stuck (%s)\n",
                       (orv == 0u) ? "all 0x00" : "all 0xFF");
            }
        }
        ax = (int16_t)((uint16_t)buf[0] | (uint16_t)buf[1] << 8);
        ay = (int16_t)((uint16_t)buf[2] | (uint16_t)buf[3] << 8);
        az = (int16_t)((uint16_t)buf[4] | (uint16_t)buf[5] << 8);

        result = imu_reg_read(BMI270_REG_GYR_X_LSB, buf, 6u);
        if (result != CY_RSLT_SUCCESS)
            return (int)result;
        {
            uint8_t orv = 0u, andv = 0xFFu;
            for (unsigned i = 0; i < 6u; i++) { orv |= buf[i]; andv &= buf[i]; }
            if (orv == 0u || andv == 0xFFu) {
                printf("IMU: warning BMI270 gyro raw looks stuck (%s)\n",
                       (orv == 0u) ? "all 0x00" : "all 0xFF");
            }
        }
        gx = (int16_t)((uint16_t)buf[0] | (uint16_t)buf[1] << 8);
        gy = (int16_t)((uint16_t)buf[2] | (uint16_t)buf[3] << 8);
        gz = (int16_t)((uint16_t)buf[4] | (uint16_t)buf[5] << 8);

        out->accel_x = (float)ax / BMI270_ACCEL_LSB_G * 9.80665f;
        out->accel_y = (float)ay / BMI270_ACCEL_LSB_G * 9.80665f;
        out->accel_z = (float)az / BMI270_ACCEL_LSB_G * 9.80665f;
        out->gyro_x  = (float)gx / BMI270_GYRO_LSB_DPS * DEG_TO_RAD;
        out->gyro_y  = (float)gy / BMI270_GYRO_LSB_DPS * DEG_TO_RAD;
        out->gyro_z  = (float)gz / BMI270_GYRO_LSB_DPS * DEG_TO_RAD;
        return 0;
    }

    /* ICM-20948: bank 0, then accel + gyro at 0x2D (12 bytes, big-endian) */
    result = imu_reg_write(ICM20948_REG_BANK_SEL, ICM20948_BANK_0);
    if (result != CY_RSLT_SUCCESS)
        return (int)result;
    result = imu_reg_read(ICM20948_REG_ACCEL_XOUT_H, buf, 12u);
    if (result != CY_RSLT_SUCCESS)
        return (int)result;

    /* Quick diagnostic: all-zeros or all-0xFF usually means the IMU isn't streaming. */
    {
        uint8_t orv = 0u;
        uint8_t andv = 0xFFu;
        for (unsigned i = 0; i < 12u; i++) {
            orv |= buf[i];
            andv &= buf[i];
        }
        if (orv == 0u || andv == 0xFFu) {
            printf("IMU: warning raw data looks stuck (%s)\n",
                   (orv == 0u) ? "all 0x00" : "all 0xFF");
        }
    }

    ax = (int16_t)((uint16_t)buf[0] << 8 | buf[1]);
    ay = (int16_t)((uint16_t)buf[2] << 8 | buf[3]);
    az = (int16_t)((uint16_t)buf[4] << 8 | buf[5]);
    gx = (int16_t)((uint16_t)buf[6]  << 8 | buf[7]);
    gy = (int16_t)((uint16_t)buf[8]  << 8 | buf[9]);
    gz = (int16_t)((uint16_t)buf[10] << 8 | buf[11]);

    out->accel_x = (float)ax / ICM20948_ACCEL_LSB_G * 9.80665f;
    out->accel_y = (float)ay / ICM20948_ACCEL_LSB_G * 9.80665f;
    out->accel_z = (float)az / ICM20948_ACCEL_LSB_G * 9.80665f;
    out->gyro_x  = (float)gx / ICM20948_GYRO_LSB_DPS * DEG_TO_RAD;
    out->gyro_y  = (float)gy / ICM20948_GYRO_LSB_DPS * DEG_TO_RAD;
    out->gyro_z  = (float)gz / ICM20948_GYRO_LSB_DPS * DEG_TO_RAD;
    return 0;
}

/******************************************************************************
 * Function Name: imu_read_temperature
 ******************************************************************************/
int imu_read_temperature(float *out_celsius)
{
    cy_rslt_t result;
    uint8_t buf[2];
    int16_t raw;

    if (out_celsius == NULL || imu_chip != IMU_CHIP_BMI270)
        return -1;

    result = imu_reg_read(BMI270_REG_TEMP, buf, 2u);
    if (result != CY_RSLT_SUCCESS)
        return (int)result;

    raw = (int16_t)((uint16_t)buf[0] | (uint16_t)buf[1] << 8);
    *out_celsius = BMI270_TEMP_OFFSET_C + (float)raw / BMI270_TEMP_SCALE;
    return 0;
}

/******************************************************************************
 * Function Name: imu_model_name
 ******************************************************************************/
const char *imu_model_name(void)
{
    switch (imu_chip) {
    case IMU_CHIP_BMI270:
        return "BMI270";
    case IMU_CHIP_ICM20948:
        return "ICM-20948";
    default:
        return "none";
    }
}

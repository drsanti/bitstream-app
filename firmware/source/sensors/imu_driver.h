/*******************************************************************************
 * File Name 	: imu_driver.h
 *
 * Description 	: Public interface for IMU driver (ICM-20948 compatible);
 *                accelerometer and gyroscope readings over I2C.
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

#ifndef IMU_DRIVER_H_
#define IMU_DRIVER_H_

#include "cyhal.h"

/*******************************************************************************
* Data structures
********************************************************************************/
/* Accelerometer and gyroscope readings (SI-like units). */
typedef struct {
    float accel_x;  /* m/s² */
    float accel_y;
    float accel_z;
    float gyro_x;   /* rad/s */
    float gyro_y;
    float gyro_z;
} imu_accel_gyro_t;

/*******************************************************************************
* Function Prototypes
********************************************************************************/
/** Initialize IMU on the given I2C bus (wake from sleep, default scales). Call once after i2c_init(). Returns 0 on success. */
int imu_init(cyhal_i2c_t *i2c);

/** Read accelerometer and gyroscope. Returns 0 on success, non-zero on failure. */
int imu_read_accel_gyro(imu_accel_gyro_t *out);

/** Read internal temperature in °C (BMI270 only). Returns 0 on success, non-zero if unsupported or error. */
int imu_read_temperature(float *out_celsius);

/** Short model name for telemetry JSON, e.g. `"BMI270"`, `"ICM-20948"`, or `"none"` if not initialized. */
const char *imu_model_name(void);

#endif /* IMU_DRIVER_H_ */

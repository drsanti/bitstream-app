/*******************************************************************************
 * File Name 	: sensors_config.h
 *
 * Description 	: Pin and I2C configuration for onboard sensors (IMU,
 *                magnetometer) on CY8CKIT-062S2-AI and compatible boards.
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

#ifndef SENSORS_CONFIG_H_
#define SENSORS_CONFIG_H_

/*******************************************************************************
* I2C for IMU / Magnetometer
********************************************************************************/
/* I2C SDA and SCL pins. If your BSP defines CYBSP_I2C_SDA / CYBSP_I2C_SCL
 * (e.g. CY8CKIT-062S2-AI), the driver will use those. Otherwise define
 * IMU_I2C_SDA and IMU_I2C_SCL here to your board's sensor I2C pins (cyhal_gpio_t).
 */
#ifndef IMU_I2C_SDA
/* Default: P6.0 (adjust to match your schematic if not using BSP I2C pins) */
#define IMU_I2C_SDA    (6u * 16u + 0u)
#endif
#ifndef IMU_I2C_SCL
#define IMU_I2C_SCL    (6u * 16u + 1u)
#endif

/* I2C clock frequency (Hz). */
#define IMU_I2C_FREQ_HZ    (400000u)

/*******************************************************************************
* IMU (ICM-20948 or compatible)
********************************************************************************/
/* I2C 7-bit address. ICM-20948: 0x68 (AD0 low) or 0x69 (AD0 high). */
#define IMU_I2C_ADDR       (0x68u)

/*******************************************************************************
* Magnetometer (BMM150, same I2C bus as IMU)
********************************************************************************/
/* Magnetometer I2C 7-bit address varies by part/strap:
 * - BMM150 commonly uses 0x10 (SDO low) or 0x11 (SDO high)
 * - BMM350 boards are often wired as 0x14/0x15
 */
#define MAG_I2C_ADDR       (0x14u)

#endif /* SENSORS_CONFIG_H_ */

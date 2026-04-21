/*******************************************************************************
 * File Name 	: mag_driver.h
 *
 * Description 	: Public interface for magnetometer driver (BMM150 / BMM350)
 *                on the same I2C bus as the IMU. Use after I2C and IMU are
 *                initialized; call mag_init() with the shared I2C handle.
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

#ifndef MAG_DRIVER_H_
#define MAG_DRIVER_H_

#include "cyhal.h"

/*******************************************************************************
* Data structures
********************************************************************************/
/* Magnetometer readings in µT; optional die temperature (BMM350 only). */
typedef struct {
    float mag_x;
    float mag_y;
    float mag_z;
    float temperature_c; /* °C when temp_valid */
    int temp_valid;        /* 1 if temperature_c is from BMM350 */
} mag_data_t;

/*******************************************************************************
* Function Prototypes
********************************************************************************/
/** Initialize / probe magnetometer on the given I2C bus. Tries 0x14 and 0x15.
 *  Call once after I2C (and IMU) are initialized. Returns 0 on success. */
int mag_init(cyhal_i2c_t *i2c);

/** Returns 1 if a magnetometer (BMM350/BMM150) was detected at init, 0 otherwise. */
int mag_available(void);

/** Read magnetometer. Returns 0 on success, non-zero on failure. Valid only if mag_available(). */
int mag_read(mag_data_t *out);

/** Short model name for telemetry JSON, e.g. `"BMM150"`, `"BMM350"`, or `"none"` if not present. */
const char *mag_model_name(void);

#endif /* MAG_DRIVER_H_ */

/* [] END OF FILE */

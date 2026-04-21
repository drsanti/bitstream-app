/*******************************************************************************
 * File Name 	: i2c_driver.h
 *
 * Description 	: Shared I2C bus driver for sensors (IMU, magnetometer).
 *                Provides init, handle access, and mutex lock/unlock for
 *                thread-safe access. Call i2c_init() once, then i2c_get() to
 *                pass the handle to device drivers; use i2c_lock()/i2c_unlock()
 *                around each bus transaction in device code.
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

#ifndef I2C_DRIVER_H_
#define I2C_DRIVER_H_

#include "cyhal.h"

/*******************************************************************************
* Function Prototypes
********************************************************************************/
/** Initialize the shared I2C bus (pins and frequency from sensors_config).
 *  Call once before i2c_get() or any device init. Returns 0 on success. */
int i2c_init(void);

/** Return the I2C handle. Call only after i2c_init() succeeded. */
cyhal_i2c_t *i2c_get(void);

/** Take the I2C mutex. Call before any cyhal_i2c_* on this bus. */
void i2c_lock(void);

/** Release the I2C mutex. Call after the bus transaction is complete. */
void i2c_unlock(void);

#endif /* I2C_DRIVER_H_ */

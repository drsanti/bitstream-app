/*******************************************************************************
 * File Name 	: i2c_driver.c
 *
 * Description 	: Shared I2C bus for IMU and magnetometer. Owns init and a
 *                mutex for thread-safe access. Uses sensors_config for pins
 *                and frequency.
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

#include "i2c_driver.h"
#include "sensors_config.h"
#include "cyhal.h"
#include "cy_retarget_io.h"
#include "cybsp.h"
#include "FreeRTOS.h"
#include "semphr.h"
#include <stdio.h>

/*******************************************************************************
* Static variables
********************************************************************************/
static cyhal_i2c_t i2c_obj;
static SemaphoreHandle_t i2c_mutex = NULL;
static int i2c_inited = 0;

/******************************************************************************
 * Function Name: i2c_init
 ******************************************************************************/
int i2c_init(void)
{
    cy_rslt_t result;
    cyhal_gpio_t pin_sda;
    cyhal_gpio_t pin_scl;

    if (i2c_inited)
        return 0;

#if defined(CYBSP_I2C_SDA) && defined(CYBSP_I2C_SCL)
    pin_sda = CYBSP_I2C_SDA;
    pin_scl = CYBSP_I2C_SCL;
#else
    pin_sda = (cyhal_gpio_t)IMU_I2C_SDA;
    pin_scl = (cyhal_gpio_t)IMU_I2C_SCL;
#endif

    result = cyhal_i2c_init(&i2c_obj, pin_sda, pin_scl, NULL);
    if (result != CY_RSLT_SUCCESS) {
        printf("I2C: init failed 0x%08lX\n", (unsigned long)result);
        return (int)result;
    }

    {
        cyhal_i2c_cfg_t i2c_cfg = {
            .is_slave       = CYHAL_I2C_MODE_MASTER,
            .address        = 0u,
            .frequencyhal_hz = IMU_I2C_FREQ_HZ
        };
        result = cyhal_i2c_configure(&i2c_obj, &i2c_cfg);
    }
    if (result != CY_RSLT_SUCCESS) {
        cyhal_i2c_free(&i2c_obj);
        printf("I2C: configure failed 0x%08lX\n", (unsigned long)result);
        return (int)result;
    }

    i2c_mutex = xSemaphoreCreateMutex();
    if (i2c_mutex == NULL) {
        cyhal_i2c_free(&i2c_obj);
        printf("I2C: mutex create failed\n");
        return -1;
    }

    i2c_inited = 1;
    printf("I2C: bus initialized\n");
    return 0;
}

/******************************************************************************
 * Function Name: i2c_get
 ******************************************************************************/
cyhal_i2c_t *i2c_get(void)
{
    if (!i2c_inited)
        return NULL;
    return &i2c_obj;
}

/******************************************************************************
 * Function Name: i2c_lock
 ******************************************************************************/
void i2c_lock(void)
{
    if (i2c_mutex != NULL)
        (void)xSemaphoreTake(i2c_mutex, portMAX_DELAY);
}

/******************************************************************************
 * Function Name: i2c_unlock
 ******************************************************************************/
void i2c_unlock(void)
{
    if (i2c_mutex != NULL)
        (void)xSemaphoreGive(i2c_mutex);
}

/* [] END OF FILE */

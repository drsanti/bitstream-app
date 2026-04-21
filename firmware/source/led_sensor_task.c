/*******************************************************************************
 * File Name 	: led_sensor_task.c
 *
 * Description 	: FreeRTOS task that drives USER_LED2 (P5_4) as sensor-running
 *                indicator: 1 Hz, 2% duty cycle.
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

#include "cyhal.h"
#include "cybsp.h"
#include "FreeRTOS.h"
#include "task.h"
#include "led_sensor_task.h"

/*******************************************************************************
 * Macros
 ********************************************************************************/
#if defined(CYBSP_USER_LED2)
#define LED_SENSOR_PIN (CYBSP_USER_LED2)
#else
#define LED_SENSOR_PIN ((cyhal_gpio_t)(5u * 16u + 4u))
#endif
/* 1 Hz, 2% duty: 20 ms on, 980 ms off */
#define LED_SENSOR_PERIOD_MS (1000u)
#define LED_SENSOR_ON_MS     (20u)   /* 2% of 1000 */
#define LED_SENSOR_OFF_MS    (980u)

/*******************************************************************************
 * Function Name: led_sensor_task
 *******************************************************************************
 * Summary:
 *  Task that blinks USER_LED2 with 2% duty at 1 Hz to indicate sensor task
 *  (system) is running.
 ******************************************************************************/
void led_sensor_task(void *pvParameters)
{
    (void)pvParameters;

    (void)cyhal_gpio_init(LED_SENSOR_PIN, CYHAL_GPIO_DIR_OUTPUT,
                         CYHAL_GPIO_DRIVE_STRONG, CYBSP_LED_STATE_OFF);

    for (;;)
    {
        cyhal_gpio_write(LED_SENSOR_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(LED_SENSOR_ON_MS));
        cyhal_gpio_write(LED_SENSOR_PIN, 0);
        vTaskDelay(pdMS_TO_TICKS(LED_SENSOR_OFF_MS));
    }
}

/* [] END OF FILE */

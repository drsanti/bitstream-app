/*******************************************************************************
 * File Name 	: led_control_task.c
 *
 * Description 	: FreeRTOS task that drives USER_LED1 (P5_3) as connection-status
 *                indicator: 10 Hz / 5 Hz / 1 Hz, 2% duty, per WiFi/MQTT state.
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
#include "led_control_task.h"
#include "mqtt_task.h"
#include "cy_wcm.h"

/*******************************************************************************
 * Macros
 ********************************************************************************/
#define DUTY_PERCENT (2u)
#define FREQ_HZ_NOT_CONNECTED (10u)
#define FREQ_HZ_WIFI_ONLY     (5u)
#define FREQ_HZ_MQTT_GOOD     (1u)

/*******************************************************************************
 * Function Name: led_control_task
 *******************************************************************************
 * Summary:
 *  Task that blinks USER_LED1 (CYBSP_USER_LED) with 2% duty cycle. Frequency
 *  depends on connection state: 10 Hz (not connected), 5 Hz (WiFi only),
 *  1 Hz (MQTT connected).
 ******************************************************************************/
void led_control_task(void *pvParameters)
{
    (void)pvParameters;

    (void)cyhal_gpio_init(CYBSP_USER_LED, CYHAL_GPIO_DIR_OUTPUT,
                         CYHAL_GPIO_DRIVE_STRONG, CYBSP_LED_STATE_OFF);

    for (;;)
    {
        uint32_t freq_hz;
        if (cy_wcm_is_connected_to_ap() == 0)
            freq_hz = FREQ_HZ_NOT_CONNECTED;
        else if (!mqtt_is_connected())
            freq_hz = FREQ_HZ_WIFI_ONLY;
        else
            freq_hz = FREQ_HZ_MQTT_GOOD;

        {
            uint32_t period_ms = 1000u / freq_hz;
            uint32_t on_ms  = (period_ms * DUTY_PERCENT) / 100u;
            uint32_t off_ms = period_ms - on_ms;
            if (on_ms == 0u) on_ms = 1u;
            if (off_ms == 0u) off_ms = 1u;

            cyhal_gpio_write(CYBSP_USER_LED, 1);
            vTaskDelay(pdMS_TO_TICKS(on_ms));
            cyhal_gpio_write(CYBSP_USER_LED, 0);
            vTaskDelay(pdMS_TO_TICKS(off_ms));
        }
    }
}

/* [] END OF FILE */

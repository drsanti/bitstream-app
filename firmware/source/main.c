/*******************************************************************************
 * File Name 	: main.c
 *
 * Description 	: MQTT Client Example for ModusToolbox. System entry point,
 *                initializes retarget IO, MQTT client task, and RTOS scheduler.
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

/* Header file includes */
#include "cyhal.h"
#include "cybsp.h"
#include "cy_retarget_io.h"

#include "mqtt_task.h"
#include "sensor_task.h"
#include "led_control_task.h"
#include "led_sensor_task.h"

#include "FreeRTOS.h"
#include "task.h"

/* Include serial flash library and QSPI memory configurations only for the
 * kits that require the Wi-Fi firmware to be loaded in external QSPI NOR flash.
 */
#if defined(CY_DEVICE_PSOC6A512K)
#include "cy_serial_flash_qspi.h"
#include "cycfg_qspi_memslot.h"
#endif

/******************************************************************************
 * Function Name: main
 ******************************************************************************
 * Summary:
 *  System entrance point. This function initializes retarget IO, sets up 
 *  the MQTT client task, and then starts the RTOS scheduler.
 *
 * Parameters:
 *  void
 *
 * Return:
 *  int
 *
 ******************************************************************************/
int main()
{
    cy_rslt_t result;

#if defined (CY_DEVICE_SECURE)
    cyhal_wdt_t wdt_obj;

    /* Clear watchdog timer so that it doesn't trigger a reset */
    result = cyhal_wdt_init(&wdt_obj, cyhal_wdt_get_max_timeout_ms());
    CY_ASSERT(CY_RSLT_SUCCESS == result);
    cyhal_wdt_free(&wdt_obj);
#endif /* #if defined (CY_DEVICE_SECURE) */
    /* Initialize the board support package. */
    
    result = cybsp_init();
    CY_ASSERT(CY_RSLT_SUCCESS == result);

    /* To avoid compiler warnings. */
    (void) result;

    /* Enable global interrupts. */
    __enable_irq();

    /* Initialize retarget-io to use the debug UART port. */
    cy_retarget_io_init(CYBSP_DEBUG_UART_TX, CYBSP_DEBUG_UART_RX,
                        CY_RETARGET_IO_BAUDRATE);

#if defined(CY_DEVICE_PSOC6A512K)
    /* Initialize the QSPI serial NOR flash with clock frequency of 50 MHz. */
    const uint32_t bus_frequency = 50000000lu;
    cy_serial_flash_qspi_init(smifMemConfigs[0], CYBSP_QSPI_D0, CYBSP_QSPI_D1,
                                  CYBSP_QSPI_D2, CYBSP_QSPI_D3, NC, NC, NC, NC,
                                  CYBSP_QSPI_SCK, CYBSP_QSPI_SS, bus_frequency);

    /* Enable the XIP mode to get the Wi-Fi firmware from the external flash. */
    cy_serial_flash_qspi_enable_xip(true);
#endif

    /* \x1b[2J\x1b[;H - ANSI ESC sequence to clear screen. */
    printf("\x1b[2J\x1b[;H");
    printf("===============================================================\n");
#if defined(COMPONENT_CM0P)
    printf("CE229889 - MQTT Client running on CM0+\n");
#endif

#if defined(COMPONENT_CM4)
    printf("CE229889 - MQTT Client running on CM4\n");
#endif

#if defined(COMPONENT_CM7)
    printf("CE229889 - MQTT Client running on CM7\n");
#endif
    printf("===============================================================\n\n");

    /* Create the MQTT Client task. */
    xTaskCreate(mqtt_client_task, "MQTT Client task", MQTT_CLIENT_TASK_STACK_SIZE,
                NULL, MQTT_CLIENT_TASK_PRIORITY, NULL);

    /* Create the sensor task (runs even without network; prints values, publishes when MQTT connected). */
    xTaskCreate(sensor_task, "Sensor task", SENSOR_TASK_STACK_SIZE,
                NULL, SENSOR_TASK_PRIORITY, &sensor_task_handle);

    /* Create the LED control task (connection-status indicator on USER_LED1). */
    xTaskCreate(led_control_task, "LED control", LED_CONTROL_TASK_STACK_SIZE,
                NULL, LED_CONTROL_TASK_PRIORITY, NULL);

    /* Create the sensor LED task (sensor-running indicator on USER_LED2). */
    xTaskCreate(led_sensor_task, "LED sensor", LED_SENSOR_TASK_STACK_SIZE,
                NULL, LED_SENSOR_TASK_PRIORITY, NULL);

    /* Start the FreeRTOS scheduler. */
    vTaskStartScheduler();

    /* Should never get here. */
    CY_ASSERT(0);
}

/* [] END OF FILE */

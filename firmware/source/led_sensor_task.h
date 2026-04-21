/*******************************************************************************
 * File Name 	: led_sensor_task.h
 *
 * Description 	: Public interface for the LED task that drives USER_LED2 (P5_4)
 *                as sensor-task-running indicator (1 Hz, 2% duty).
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

#ifndef LED_SENSOR_TASK_H_
#define LED_SENSOR_TASK_H_

#include "FreeRTOS.h"
#include "task.h"

/*******************************************************************************
 * Macros
 ********************************************************************************/
#define LED_SENSOR_TASK_PRIORITY   (1)
#define LED_SENSOR_TASK_STACK_SIZE (512)

/*******************************************************************************
 * Function Prototypes
 ********************************************************************************/
void led_sensor_task(void *pvParameters);

#endif /* LED_SENSOR_TASK_H_ */

/* [] END OF FILE */

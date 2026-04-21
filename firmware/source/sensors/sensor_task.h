/*******************************************************************************
 * File Name 	: sensor_task.h
 *
 * Description 	: Public interface for environment sensor task; temperature/
 *                humidity simulation and MQTT publish at fixed interval.
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

#ifndef SENSOR_TASK_H_
#define SENSOR_TASK_H_

#include "FreeRTOS.h"
#include "task.h"

/*******************************************************************************
 * Macros
 ********************************************************************************/
/* Task parameters for the sensor task. */
#define SENSOR_TASK_PRIORITY (2)
#define SENSOR_TASK_STACK_SIZE (1024)

/* Interval between publishing simulated sensor values (milliseconds). */
#define SENSOR_PUBLISH_INTERVAL_MS (1000)

/*******************************************************************************
 * Extern Variables
 ********************************************************************************/
extern TaskHandle_t sensor_task_handle;

/*******************************************************************************
 * Function Prototypes
 ********************************************************************************/
void sensor_task(void *pvParameters);

#endif /* SENSOR_TASK_H_ */

/* [] END OF FILE */

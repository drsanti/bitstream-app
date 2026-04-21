/*******************************************************************************
 * File Name 	: mqtt_task.h
 *
 * Description 	: Public interface for the MQTT/Wi-Fi task (mqtt_task.c).
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

#ifndef MQTT_TASK_H_
#define MQTT_TASK_H_

#include "FreeRTOS.h"
#include "queue.h"
#include "cy_mqtt_api.h"


/*******************************************************************************
* Macros
********************************************************************************/
/* Task parameters for MQTT Client Task. */
#define MQTT_CLIENT_TASK_PRIORITY       (2)
#define MQTT_CLIENT_TASK_STACK_SIZE     (1024 * 2)

/*******************************************************************************
* Global Variables
********************************************************************************/
/* Commands for the MQTT Client Task. */
typedef enum
{
    HANDLE_MQTT_SUBSCRIBE_FAILURE,
    HANDLE_MQTT_PUBLISH_FAILURE,
    HANDLE_DISCONNECTION
} mqtt_task_cmd_t;

/*******************************************************************************
 * Extern variables
 ******************************************************************************/
extern cy_mqtt_t mqtt_connection;
extern QueueHandle_t mqtt_task_q;

/*******************************************************************************
* Function Prototypes
********************************************************************************/
void mqtt_client_task(void *pvParameters);

/** Returns 1 if MQTT is connected to the broker, 0 otherwise. */
int mqtt_is_connected(void);

#endif /* MQTT_TASK_H_ */

/* [] END OF FILE */

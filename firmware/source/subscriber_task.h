/*******************************************************************************
 * File Name 	: subscriber_task.h
 *
 * Description 	: Public interface for the MQTT subscriber task (subscriber_task.c).
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

#ifndef SUBSCRIBER_TASK_H_
#define SUBSCRIBER_TASK_H_

#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "cy_mqtt_api.h"

/*******************************************************************************
* Macros
********************************************************************************/
/* Task parameters for Subscriber Task. */
#define SUBSCRIBER_TASK_PRIORITY           (2)
#define SUBSCRIBER_TASK_STACK_SIZE         (1024 * 1)

/* 8-bit value denoting the device (LED) state. */
#define DEVICE_ON_STATE                    (0x00u)
#define DEVICE_OFF_STATE                   (0x01u)

/*******************************************************************************
* Global Variables
********************************************************************************/
/* Commands for the Subscriber Task. */
typedef enum
{
    SUBSCRIBE_TO_TOPIC,
    UNSUBSCRIBE_FROM_TOPIC,
    UPDATE_DEVICE_STATE
} subscriber_cmd_t;

/* Struct to be passed via the subscriber task queue */
typedef struct{
    subscriber_cmd_t cmd;
    uint8_t data;
} subscriber_data_t;

/*******************************************************************************
* Extern Variables
********************************************************************************/
extern TaskHandle_t subscriber_task_handle;
extern QueueHandle_t subscriber_task_q;
extern uint32_t current_device_state;

/*******************************************************************************
* Function Prototypes
********************************************************************************/
void subscriber_task(void *pvParameters);
void mqtt_subscription_callback(cy_mqtt_publish_info_t *received_msg_info);

#endif /* SUBSCRIBER_TASK_H_ */

/* [] END OF FILE */

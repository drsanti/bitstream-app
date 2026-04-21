/*******************************************************************************
 * File Name 	: publisher_task.c
 *
 * Description 	: FreeRTOS task that publishes MQTT messages on MQTT_PUB_TOPIC
 *                when requested via the task queue.
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
#include "FreeRTOS.h"

/* Task header files */
#include "publisher_task.h"
#include "mqtt_task.h"

/* Configuration file for MQTT client */
#include "mqtt_client_config.h"

/* Middleware libraries */
#include "cy_mqtt_api.h"
#include "cy_retarget_io.h"

/******************************************************************************
* Macros
******************************************************************************/
/* Queue length of a message queue that is used to communicate with the publisher task. */
#define PUBLISHER_TASK_QUEUE_LENGTH     (3u)

/******************************************************************************
* Function Prototypes
*******************************************************************************/
void print_heap_usage(char *msg);

/******************************************************************************
* Global Variables
*******************************************************************************/
/* FreeRTOS task handle for this task. */
TaskHandle_t publisher_task_handle;

/* Handle of the queue holding the commands for the publisher task */
QueueHandle_t publisher_task_q;

/* Structure to store publish message information. */
cy_mqtt_publish_info_t publish_info =
{
    .qos = (cy_mqtt_qos_t) MQTT_MESSAGES_QOS,
    .topic = MQTT_PUB_TOPIC,
    .topic_len = (sizeof(MQTT_PUB_TOPIC) - 1),
    .retain = false,
    .dup = false
};

/******************************************************************************
 * Function Name: publisher_task
 ******************************************************************************
 * Summary:
 *  Task that publishes MQTT messages to the broker when commands are received
 *  over the message queue.
 *
 * Parameters:
 *  void *pvParameters : Task parameter defined during task creation (unused)
 *
 * Return:
 *  void
 *
 ******************************************************************************/
void publisher_task(void *pvParameters)
{
    cy_rslt_t result;
    publisher_data_t publisher_q_data;
    mqtt_task_cmd_t mqtt_task_cmd;

    (void) pvParameters;

    publisher_task_q = xQueueCreate(PUBLISHER_TASK_QUEUE_LENGTH, sizeof(publisher_data_t));

    while (true)
    {
        if (pdTRUE == xQueueReceive(publisher_task_q, &publisher_q_data, portMAX_DELAY))
        {
            if (publisher_q_data.cmd == PUBLISH_MQTT_MSG)
            {
                publish_info.payload = publisher_q_data.data;
                publish_info.payload_len = strlen(publish_info.payload);

                printf("\nPublisher: Publishing '%s' on the topic '%s'\n",
                       (char *) publish_info.payload, publish_info.topic);

                result = cy_mqtt_publish(mqtt_connection, &publish_info);

                if (result != CY_RSLT_SUCCESS)
                {
                    printf("  Publisher: MQTT Publish failed with error 0x%0X.\n\n", (int)result);
                    mqtt_task_cmd = HANDLE_MQTT_PUBLISH_FAILURE;
                    xQueueSend(mqtt_task_q, &mqtt_task_cmd, portMAX_DELAY);
                }

                print_heap_usage("publisher_task: After publishing an MQTT message");
            }
        }
    }
}

/* [] END OF FILE */

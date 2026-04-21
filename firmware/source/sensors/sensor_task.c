/*******************************************************************************
 * File Name 	: sensor_task.c
 *
 * Description 	: FreeRTOS task that reads environment, IMU, and magnetometer;
 *                publishes JSON over MQTT using a common envelope per topic:
 *                sensor, sequence, parameters { ... }.
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

#include "sensor_task.h"
#include "i2c_driver.h"
#include "imu_driver.h"
#include "mag_driver.h"
#include "sim_driver.h"
#include "cy_mqtt_api.h"
#include "cy_retarget_io.h"
#include "mqtt_client_config.h"
#include "mqtt_task.h"
#include <stdbool.h>
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

/*******************************************************************************
 * Macros
 ********************************************************************************/
/* Payload buffer sizes (compact JSON; see README "MQTT topics and payloads"). */
#define SENSOR_PAYLOAD_BUF_SIZE (384u)
#define IMU_PAYLOAD_BUF_SIZE    (384u)
#define MAG_PAYLOAD_BUF_SIZE    (320u)

/*******************************************************************************
 * Global Variables
 ********************************************************************************/
TaskHandle_t sensor_task_handle;

/******************************************************************************
 * Function Name: sensor_task
 ******************************************************************************
 * Summary:
 *  FreeRTOS task that every SENSOR_PUBLISH_INTERVAL_MS (1 s) reads sensors,
 *  formats JSON payloads, and publishes on MQTT_ENV_TOPIC, MQTT_IMU_TOPIC,
 *  and MQTT_MAG_TOPIC.
 *
 * Parameters:
 *  void *pvParameters : Task parameter (unused)
 *
 * Return:
 *  void
 ******************************************************************************/
void sensor_task(void *pvParameters) {
  cy_rslt_t result;
  char payload[SENSOR_PAYLOAD_BUF_SIZE];
  char imu_payload[IMU_PAYLOAD_BUF_SIZE];
  char mag_payload[MAG_PAYLOAD_BUF_SIZE];
  cy_mqtt_publish_info_t publish_info = {
      .qos = (cy_mqtt_qos_t)MQTT_MESSAGES_QOS,
      .topic = MQTT_ENV_TOPIC,
      .topic_len = (sizeof(MQTT_ENV_TOPIC) - 1u),
      .retain = false,
      .dup = false,
      .payload = payload,
      .payload_len = 0u};
  if (i2c_init() != 0) {
    printf("Sensors: I2C init failed, skipping IMU/MAG\n");
  }
  bool imu_ok = (i2c_get() != NULL && imu_init(i2c_get()) == 0);
  int mag_init_rc = -1;
  if (i2c_get() != NULL)
    mag_init_rc = mag_init(i2c_get());
  bool mag_ok = (mag_init_rc == 0) && mag_available();

  (void)pvParameters;

  printf("MAG init: %s (rc=%d)\n", mag_ok ? "ok" : "not found", mag_init_rc);

  sim_seed((unsigned)xTaskGetTickCount());

  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(SENSOR_PUBLISH_INTERVAL_MS));

    /* ENV: sensor + monotonic sequence + nested parameters object. */
    {
      static uint32_t env_sequence = 0u;
      float temp;
      int temp_from_imu = 0;
      if (imu_ok && imu_read_temperature(&temp) == 0) {
        temp_from_imu = 1;
      } else {
        temp = sim_rand_temperature();
      }
      unsigned int humidity = sim_rand_humidity();
      float pressure_hpa = sim_rand_pressure_hpa();
      unsigned int co2_ppm = sim_rand_co2_ppm();
      float pm25_ugm3 = sim_rand_pm25_ugm3();
      env_sequence++;
      int len = snprintf(
          payload, sizeof(payload),
          "{\"sensor\":\"%s\",\"client-id\":\"%s\",\"sequence\":%" PRIu32
          ",\"parameters\":{\"temperature\":%.1f,\"humidity\":%u,"
          "\"pressure_hpa\":%.1f,\"co2_ppm\":%u,\"pm25_ugm3\":%.1f}}",
          temp_from_imu ? "env-mixed" : "env-sim", MQTT_CLIENT_ID, env_sequence,
          (double)temp, humidity, (double)pressure_hpa, co2_ppm, (double)pm25_ugm3);
      if (len > 0 && (size_t)len < sizeof(payload)) {
        printf("\nENV: %s\n", payload);
        if (mqtt_is_connected()) {
          publish_info.topic     = MQTT_ENV_TOPIC;
          publish_info.topic_len = (sizeof(MQTT_ENV_TOPIC) - 1u);
          publish_info.payload   = payload;
          publish_info.payload_len = (size_t)len;
          result = cy_mqtt_publish(mqtt_connection, &publish_info);
          if (result == CY_RSLT_SUCCESS) {
            printf("  -> published on '%s'\n", MQTT_ENV_TOPIC);
          } else {
            printf("  -> MQTT publish failed 0x%08lX\n", (unsigned long)result);
          }
        } else {
          printf("  -> (not connected, skip MQTT)\n");
        }
      }
    }

    /* IMU: sensor, chip, sequence, parameters (tc optional, then ax…gz). */
    if (imu_ok) {
      static uint32_t imu_sequence = 0u;
      imu_accel_gyro_t ag;
      if (imu_read_accel_gyro(&ag) == 0) {
        float imu_temp_c = 0.0f;
        int has_imu_temp = (imu_read_temperature(&imu_temp_c) == 0);
        imu_sequence++;
        int len;
        if (has_imu_temp) {
          len = snprintf(
              imu_payload, sizeof(imu_payload),
              "{\"sensor\":\"imu\",\"client-id\":\"%s\",\"chip\":\"%s\",\"sequence\":%" PRIu32
              ",\"parameters\":{\"tc\":%.1f,\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
              "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}}",
              MQTT_CLIENT_ID, imu_model_name(), imu_sequence, (double)imu_temp_c,
              (double)ag.accel_x, (double)ag.accel_y, (double)ag.accel_z,
              (double)ag.gyro_x, (double)ag.gyro_y, (double)ag.gyro_z);
        } else {
          len = snprintf(
              imu_payload, sizeof(imu_payload),
              "{\"sensor\":\"imu\",\"client-id\":\"%s\",\"chip\":\"%s\",\"sequence\":%" PRIu32
              ",\"parameters\":{\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
              "\"gx\":%.3f,\"gy\":%.3f,\"gz\":%.3f}}",
              MQTT_CLIENT_ID, imu_model_name(), imu_sequence, (double)ag.accel_x,
              (double)ag.accel_y, (double)ag.accel_z, (double)ag.gyro_x,
              (double)ag.gyro_y, (double)ag.gyro_z);
        }
        if (len > 0 && (size_t)len < sizeof(imu_payload)) {
          printf("IMU: %s\n", imu_payload);
          if (mqtt_is_connected()) {
            publish_info.topic     = MQTT_IMU_TOPIC;
            publish_info.topic_len = (sizeof(MQTT_IMU_TOPIC) - 1u);
            publish_info.payload   = imu_payload;
            publish_info.payload_len = (size_t)len;
            result = cy_mqtt_publish(mqtt_connection, &publish_info);
            if (result == CY_RSLT_SUCCESS) {
              printf("  -> published on '%s'\n", MQTT_IMU_TOPIC);
            } else {
              printf("  -> MQTT publish failed 0x%08lX\n", (unsigned long)result);
            }
          } else {
            printf("  -> (not connected, skip MQTT)\n");
          }
        }
      }
    }

    /* MAG: sensor, chip, sequence, parameters (tc optional for BMM350, mx…mz). */
    if (mag_ok) {
      static uint32_t mag_sequence = 0u;
      mag_data_t mag;
      int rc = mag_read(&mag);
      if (rc == 0) {
        mag_sequence++;
        int len;
        if (mag.temp_valid) {
          len = snprintf(
              mag_payload, sizeof(mag_payload),
              "{\"sensor\":\"mag\",\"client-id\":\"%s\",\"chip\":\"%s\",\"sequence\":%" PRIu32
              ",\"parameters\":{\"tc\":%.1f,\"mx\":%.1f,\"my\":%.1f,\"mz\":%.1f}}",
              MQTT_CLIENT_ID, mag_model_name(), mag_sequence, (double)mag.temperature_c,
              (double)mag.mag_x, (double)mag.mag_y, (double)mag.mag_z);
        } else {
          len = snprintf(
              mag_payload, sizeof(mag_payload),
              "{\"sensor\":\"mag\",\"client-id\":\"%s\",\"chip\":\"%s\",\"sequence\":%" PRIu32
              ",\"parameters\":{\"mx\":%.1f,\"my\":%.1f,\"mz\":%.1f}}",
              MQTT_CLIENT_ID, mag_model_name(), mag_sequence, (double)mag.mag_x,
              (double)mag.mag_y, (double)mag.mag_z);
        }
        if (len > 0 && (size_t)len < sizeof(mag_payload)) {
          printf("MAG: %s\n", mag_payload);
          if (mqtt_is_connected()) {
            publish_info.topic     = MQTT_MAG_TOPIC;
            publish_info.topic_len = (sizeof(MQTT_MAG_TOPIC) - 1u);
            publish_info.payload   = mag_payload;
            publish_info.payload_len = (size_t)len;
            result = cy_mqtt_publish(mqtt_connection, &publish_info);
            if (result == CY_RSLT_SUCCESS) {
              printf("  -> published on '%s'\n", MQTT_MAG_TOPIC);
            } else {
              printf("  -> MQTT publish failed 0x%08lX\n", (unsigned long)result);
            }
          } else {
            printf("  -> (not connected, skip MQTT)\n");
          }
        }
      } else {
        static unsigned mag_fail_print = 0;
        if ((mag_fail_print++ % 50u) == 0u) {
          printf("MAG: read failed rc=%d\n", rc);
        }
      }
    }
  }
}

/* [] END OF FILE */

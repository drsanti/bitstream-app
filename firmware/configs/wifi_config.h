/*******************************************************************************
 * File Name 	: wifi_config.h
 *
 * Description 	: Configuration macros for Wi-Fi connection (SSID, credentials,
 *                security).
 *
 * Author      	: Asst.Prof.Santi Nuratch, Ph.D
 *                INC AUTOMATION
 *                Department of Control Systems and Instrumentation Engineering
 *				  King Mongkut's University of Technology
 * Thonburi (KMUTT)
 *
 * Version     	: 1.0
 * Date         : 17 March 2026
 * Target       : CY8CKIT-062S2-AI PSoC™ 6 AI Evaluation Board
 *
 *******************************************************************************/

#ifndef WIFI_CONFIG_H_
#define WIFI_CONFIG_H_

#include "cy_wcm.h"

/*******************************************************************************
 * Macros
 ********************************************************************************/
/* SSID of the Wi-Fi Access Point to which the MQTT client connects. */
#define WIFI_SSID "TERNION"

/* Passkey of the above mentioned Wi-Fi SSID. */
#define WIFI_PASSWORD "111122134"

/* Security type of the Wi-Fi access point. See 'cy_wcm_security_t' structure
 * in "cy_wcm.h" for more details.
 */
#define WIFI_SECURITY CY_WCM_SECURITY_WPA2_AES_PSK

/* Maximum Wi-Fi re-connection limit. */
#define MAX_WIFI_CONN_RETRIES (120u)

/* Wi-Fi re-connection time interval in milliseconds. */
#define WIFI_CONN_RETRY_INTERVAL_MS (5000)

#endif /* WIFI_CONFIG_H_ */

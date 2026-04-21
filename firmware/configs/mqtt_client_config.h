/*******************************************************************************
 * File Name 	: mqtt_client_config.h
 *
 * Description 	: Configuration macros for the MQTT client (broker, topics,
 *                security, etc.).
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

#ifndef MQTT_CLIENT_CONFIG_H_
#define MQTT_CLIENT_CONFIG_H_

#include "cy_mqtt_api.h"

/*******************************************************************************
* Macros
********************************************************************************/

/***************** MQTT CLIENT CONNECTION CONFIGURATION MACROS *****************/
/* MQTT broker host: set **MQTT_BROKER_ADDRESS** to the hostname or IPv4 the
 * firmware should connect to (TCP port is MQTT_PORT below).
 *
 * Use either:
 *   - Your **PC’s LAN IPv4** when using Mosquitto in Docker (`applications/backend`)
 *     on that PC (same Wi‑Fi/LAN as the kit). Do **not** use "localhost" or
 *     "127.0.0.1" — on the board those refer to the board itself, not your PC.
 *   - A **public broker hostname** (e.g. broker.emqx.io) when not using a local broker.
 *
 * Other public hosts (examples): test.mosquitto.org, broker.hivemq.com
 */

/* Copied into telemetry JSON as top-level "client-id" (see sensor_task.c). Bitstream: mqtt-broker client-id */
#define MQTT_CLIENT_ID          "client-8gmq5fau"           /* Updated by Bitstream — 21 April 2026, 06:31:05 */
#define MQTT_BROKER_ADDRESS     "10.229.244.137"            /* Updated by Bitstream — 21 April 2026, 06:31:05 */
#define MQTT_BASE_TOPIC         "client-8gmq5fau/sensors"   /* Updated by Bitstream — 21 April 2026, 06:31:05 */
#define MQTT_PORT               1883                        /* Updated by Bitstream — 21 April 2026, 06:31:05 */


#define MQTT_SECURE_CONNECTION            ( 0 )

/* Configure the user credentials to be sent as part of MQTT CONNECT packet */
#define MQTT_USERNAME                     ""
#define MQTT_PASSWORD                     ""


/********************* MQTT MESSAGE CONFIGURATION MACROS **********************/
/* The MQTT topics to be used by the publisher and subscriber. */
#define MQTT_PUB_TOPIC                    "ledstatus"
#define MQTT_SUB_TOPIC                    "ledstatus"

/* Separate topics for env, IMU, and magnetometer. */
#define MQTT_ENV_TOPIC                    MQTT_BASE_TOPIC "/" "env"
#define MQTT_IMU_TOPIC                    MQTT_BASE_TOPIC "/" "imu"
#define MQTT_MAG_TOPIC                    MQTT_BASE_TOPIC "/" "mag"

/* Set the QoS that is associated with the MQTT publish, and subscribe messages.
 * Valid choices are 0, 1, and 2. Other values should not be used in this macro.
 */
#define MQTT_MESSAGES_QOS                 ( 1 )

/* Configuration for the 'Last Will and Testament (LWT)'. It is an MQTT message
 * that will be published by the MQTT broker if the MQTT connection is
 * unexpectedly closed. This configuration is sent to the MQTT broker during
 * MQTT connect operation and the MQTT broker will publish the Will message on
 * the Will topic when it recognizes an unexpected disconnection from the client.
 *
 * If you want to use the last will message, set this macro to 1 and configure
 * the topic and will message, else 0.
 */
#define ENABLE_LWT_MESSAGE                ( 0 )
#if ENABLE_LWT_MESSAGE
    #define MQTT_WILL_TOPIC_NAME          MQTT_PUB_TOPIC "/will"
    #define MQTT_WILL_MESSAGE             ("MQTT client unexpectedly disconnected!")
#endif

/* MQTT messages which are published on the MQTT_PUB_TOPIC that controls the
 * device (user LED in this example) state in this code example.
 */
#define MQTT_DEVICE_ON_MESSAGE            "TURN ON"
#define MQTT_DEVICE_OFF_MESSAGE           "TURN OFF"


/******************* OTHER MQTT CLIENT CONFIGURATION MACROS *******************/
/* A unique client identifier to be used for every MQTT connection. */
#define MQTT_CLIENT_IDENTIFIER            "psoc6-mqtt-client"

/* The timeout in milliseconds for MQTT operations in this example. */
#define MQTT_TIMEOUT_MS                   ( 5000 )

/* The keep-alive interval in seconds used for MQTT ping request. */
#define MQTT_KEEP_ALIVE_SECONDS           ( 60 )

/* Every active MQTT connection must have a unique client identifier. If you
 * are using the above 'MQTT_CLIENT_IDENTIFIER' as client ID for multiple MQTT
 * connections simultaneously, set this macro to 1. The device will then
 * generate a unique client identifier by appending a timestamp to the
 * 'MQTT_CLIENT_IDENTIFIER' string. Example: 'psoc6-mqtt-client5927'
 */
#define GENERATE_UNIQUE_CLIENT_ID         ( 1 )

/* The longest client identifier that an MQTT server must accept (as defined
 * by the MQTT 3.1.1 spec) is 23 characters. However some MQTT brokers support
 * longer client IDs. Configure this macro as per the MQTT broker specification.
 */
#define MQTT_CLIENT_IDENTIFIER_MAX_LEN    ( 23 )

/* As per Internet Assigned Numbers Authority (IANA) the port numbers assigned
 * for MQTT protocol are 1883 for non-secure connections and 8883 for secure
 * connections. In some cases there is a need to use other ports for MQTT like
 * port 443 (which is reserved for HTTPS). Application Layer Protocol
 * Negotiation (ALPN) is an extension to TLS that allows many protocols to be
 * used over a secure connection. The ALPN ProtocolNameList specifies the
 * protocols that the client would like to use to communicate over TLS.
 *
 * This macro specifies the ALPN Protocol Name to be used that is supported
 * by the MQTT broker in use.
 * Note: For AWS IoT, currently "x-amzn-mqtt-ca" is the only supported ALPN
 *       ProtocolName and it is only supported on port 443.
 *
 * Uncomment the below line and specify the ALPN Protocol Name to use this
 * feature.
 */
// #define MQTT_ALPN_PROTOCOL_NAME           "x-amzn-mqtt-ca"

/* Server Name Indication (SNI) is extension to the Transport Layer Security
 * (TLS) protocol. As required by some MQTT Brokers, SNI typically includes the
 * hostname in the Client Hello message sent during TLS handshake.
 *
 * Specify the SNI Host Name to use this extension
 * as specified by the MQTT Broker.
 */
#define MQTT_SNI_HOSTNAME                 (MQTT_BROKER_ADDRESS)

/* A Network buffer is allocated for sending and receiving MQTT packets over
 * the network. Specify the size of this buffer using this macro.
 *
 * Note: The minimum buffer size is defined by 'CY_MQTT_MIN_NETWORK_BUFFER_SIZE'
 * macro in the MQTT library. Please ensure this macro value is larger than
 * 'CY_MQTT_MIN_NETWORK_BUFFER_SIZE'.
 */
#define MQTT_NETWORK_BUFFER_SIZE          ( 2 * CY_MQTT_MIN_NETWORK_BUFFER_SIZE )

/* Maximum MQTT connection re-connection limit. */
#define MAX_MQTT_CONN_RETRIES            (150u)

/* MQTT re-connection time interval in milliseconds. */
#define MQTT_CONN_RETRY_INTERVAL_MS      (2000)


/**************** MQTT CLIENT CERTIFICATE CONFIGURATION MACROS ****************/

/* Configure the below credentials in case of a secure MQTT connection. */
/* PEM-encoded client certificate */
#define CLIENT_CERTIFICATE      \
"-----BEGIN CERTIFICATE-----\n"\
"........base64 data........\n"\
"-----END CERTIFICATE-----"

/* PEM-encoded client private key */
#define CLIENT_PRIVATE_KEY          \
"-----BEGIN RSA PRIVATE KEY-----\n"\
"..........base64 data..........\n"\
"-----END RSA PRIVATE KEY-----"

/* PEM-encoded Root CA certificate */
#define ROOT_CA_CERTIFICATE     \
"-----BEGIN CERTIFICATE-----\n"\
"........base64 data........\n"\
"-----END CERTIFICATE-----"


/******************************************************************************
* Global Variables
*******************************************************************************/
extern cy_mqtt_broker_info_t broker_info;
extern cy_awsport_ssl_credentials_t  *security_info;
extern cy_mqtt_connect_info_t connection_info;


#endif /* MQTT_CLIENT_CONFIG_H_ */

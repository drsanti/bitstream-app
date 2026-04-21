/*******************************************************************************
 * File Name 	: sim_driver.c
 *
 * Description 	: Simulated environment telemetry (temperature, humidity,
 *                pressure, CO₂, PM2.5) when real sensors are not used.
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

#include "sim_driver.h"
#include <stdlib.h>

/*******************************************************************************
* Simulated ranges
********************************************************************************/
#define SIM_TEMP_MIN_C    (15.0f)
#define SIM_TEMP_MAX_C    (35.0f)
#define SIM_HUMIDITY_MIN  (30u)
#define SIM_HUMIDITY_MAX  (90u)

/* hPa — sea-level-ish indoor variation */
#define SIM_PRESSURE_MIN_HPA  (990.0f)
#define SIM_PRESSURE_MAX_HPA  (1020.0f)

/* ppm — indoor CO₂ (outside air ~400) */
#define SIM_CO2_MIN_PPM  (400u)
#define SIM_CO2_MAX_PPM  (1200u)

/* µg/m³ — PM2.5 */
#define SIM_PM25_MIN_UGM3  (5.0f)
#define SIM_PM25_MAX_UGM3  (55.0f)

/******************************************************************************
 * Function Name: sim_seed
 ******************************************************************************/
void sim_seed(unsigned int seed)
{
    srand(seed);
}

/******************************************************************************
 * Function Name: sim_rand_temperature
 ******************************************************************************/
float sim_rand_temperature(void)
{
    float t = (float)(rand() % 1001) / 1000.0f; /* 0.0 .. 1.0 */
    return SIM_TEMP_MIN_C + t * (SIM_TEMP_MAX_C - SIM_TEMP_MIN_C);
}

/******************************************************************************
 * Function Name: sim_rand_humidity
 ******************************************************************************/
unsigned int sim_rand_humidity(void)
{
    unsigned int span = SIM_HUMIDITY_MAX - SIM_HUMIDITY_MIN + 1u;
    return SIM_HUMIDITY_MIN + (unsigned int)(rand() % (int)span);
}

/******************************************************************************
 * Function Name: sim_rand_pressure_hpa
 ******************************************************************************/
float sim_rand_pressure_hpa(void)
{
    float t = (float)(rand() % 1001) / 1000.0f;
    return SIM_PRESSURE_MIN_HPA + t * (SIM_PRESSURE_MAX_HPA - SIM_PRESSURE_MIN_HPA);
}

/******************************************************************************
 * Function Name: sim_rand_co2_ppm
 ******************************************************************************/
unsigned int sim_rand_co2_ppm(void)
{
    unsigned int span = SIM_CO2_MAX_PPM - SIM_CO2_MIN_PPM + 1u;
    return SIM_CO2_MIN_PPM + (unsigned int)(rand() % (int)span);
}

/******************************************************************************
 * Function Name: sim_rand_pm25_ugm3
 ******************************************************************************/
float sim_rand_pm25_ugm3(void)
{
    float t = (float)(rand() % 1001) / 1000.0f;
    return SIM_PM25_MIN_UGM3 + t * (SIM_PM25_MAX_UGM3 - SIM_PM25_MIN_UGM3);
}

/* [] END OF FILE */

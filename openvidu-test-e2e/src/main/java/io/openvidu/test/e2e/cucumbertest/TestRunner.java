package io.openvidu.test.e2e.cucumbertest;

import org.junit.runner.RunWith;
import cucumber.api.CucumberOptions;
import cucumber.api.junit.Cucumber;
 
@RunWith(Cucumber.class)
@CucumberOptions(
		features = "src/main/features"
		,glue={"io/openvidu/test/e2e/stepdefinition"}
		)
public class TestRunner { }
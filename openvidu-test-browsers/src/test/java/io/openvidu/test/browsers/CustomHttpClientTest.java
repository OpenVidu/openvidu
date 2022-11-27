package io.openvidu.test.browsers;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import io.openvidu.test.browsers.utils.CustomHttpClient;

public class CustomHttpClientTest {

	@Test
	public void testOneLevel() throws Exception {
		String expected = "{}";
		String actual = "{}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1'}";
		actual = "{'prop1':'val1'}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1','prop2':'val2'}";
		actual = "{'prop1':'val1','prop2':'val2'}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1'}";
		actual = "{'prop1':'val1','prop2':'val2'}";
		executeCheck(expected, actual, false, true, true);
		expected = "{'prop1':'val1','prop2':'val2'}";
		actual = "{'prop1':'WRONG','prop2':'WRONG'}";
		executeCheck(expected, actual, true, false, true);
		expected = "{'prop1':'val1','prop2':[{},{}]}";
		actual = "{'prop1':'WRONG','prop2':[{}]}";
		executeCheck(expected, actual, true, false, true);
	}

	@Test
	public void testMultipleLevels() throws Exception {
		String expected = "{'prop1':{'prop2':'val2'}}";
		String actual = "{'prop1':{'prop2':'val2'}}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1','prop2':{'prop3':'val3'}}";
		actual = "{'prop1':'val1','prop2':{'prop3':'val3'}}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1','prop2':{'prop3':'val3'}}";
		actual = "{'prop1':'WRONG','prop2':{'prop3':'WRONG'}}";
		executeCheck(expected, actual, true, false, true);
		Assertions.assertThrows(IllegalStateException.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':{'prop3':'val3'}}";
			String actual2 = "{'prop1':'WRONG','prop2':'WRONG'}";
			executeCheck(expected2, actual2, true, false, true);
		});
		Assertions.assertThrows(IllegalStateException.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':{'prop3':'val3'}}";
			String actual2 = "{'prop1':'WRONG','prop2':[12,34]}";
			executeCheck(expected2, actual2, true, false, true);
		});
		expected = "{'prop1':'val1','prop1':{'prop3':'val3'}}";
		actual = "{'prop1':'val1','prop1':{'prop3':'val3'},'WRONG':'val1'}";
		executeCheck(expected, actual, false, true, true);
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':[12,34]}";
			String actual2 = "{'prop1':'val1','prop2':[12,35]}";
			executeCheck(expected2, actual2, false, true, true);
		});
		Assertions.assertThrows(IllegalStateException.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':[12,34]}";
			String actual2 = "{'prop1':'val1','prop2':{'WRONG':true}}";
			executeCheck(expected2, actual2, true, false, true);
		});
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':'val1','prop1':{'prop3':null}}";
			String actual2 = "{'prop1':'val1','prop1':{'prop3':12.4},'WRONG':'val1'}";
			executeCheck(expected2, actual2, false, true, true);
		});
		expected = "{'prop1':'val1','prop2':{'prop3':null}}";
		actual = "{'prop1':'val1','prop2':{'prop3':null},'WRONG':'val1'}";
		executeCheck(expected, actual, false, true, true);
		expected = "{'prop1':'val1','prop2':{'prop3':12}}";
		actual = "{'prop1':'val1','prop2':{'prop3':12}}";
		executeCheck(expected, actual, true, true, true);
		expected = "{'prop1':'val1','prop2':[true,false]}";
		actual = "{'prop1':'val1','prop2':[true,false]}";
		executeCheck(expected, actual, true, true, true);
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':[false,true]}";
			String actual2 = "{'prop1':'val1','prop2':[true,false]}";
			executeCheck(expected2, actual2, true, true, true);
		});
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':[false,true]}";
			String actual2 = "{'prop1':'val1','prop2':[true,false]}";
			executeCheck(expected2, actual2, true, true, true);
		});
		expected = "{'prop1':'val1','prop2':[false,true]}";
		actual = "{'prop1':'val1','prop2':[]}";
		executeCheck(expected, actual, true, false, true);
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':'val1','prop2':[false,true]}";
			String actual2 = "{'prop1':'val1','prop2':[],'prop3':false}";
			executeCheck(expected2, actual2, false, true, true);
		});
		expected = "{'prop1':1,'prop2':[]}";
		actual = "{'prop1':1,'prop2':[{'prop2':'val2'}]}";
		executeCheck(expected, actual, true, true, false);
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':1,'prop2':[]}";
			String actual2 = "{'prop1':0,'prop2':[{'prop2':'val2'}]}";
			executeCheck(expected2, actual2, true, true, false);
		});
		Assertions.assertThrows(Exception.class, () -> {
			String expected2 = "{'prop1':1,'prop2':[]}";
			String actual2 = "{'prop1':1,'prop2':[{'prop2':'val2'}]}";
			executeCheck(expected2, actual2, true, true, true);
		});
	}

	private void executeCheck(String expected, String actual, boolean matchKeys, boolean matchValues,
			boolean matchArrays) throws JsonSyntaxException, Exception {
		expected = expected.replaceAll("'", "\"");
		actual = actual.replaceAll("'", "\"");
		CustomHttpClient.check(JsonParser.parseString(expected).getAsJsonObject(),
				JsonParser.parseString(actual).getAsJsonObject(), matchKeys, matchValues, matchArrays);
	}

}

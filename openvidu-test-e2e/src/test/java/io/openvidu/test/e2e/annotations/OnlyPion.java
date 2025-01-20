package io.openvidu.test.e2e.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.test.context.junit.jupiter.DisabledIf;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@DisabledIf(expression = "#{systemProperties['OPENVIDU_RTC_ENGINE'] != null && !systemProperties['OPENVIDU_RTC_ENGINE'].equals('pion')}")
public @interface OnlyPion {

}
package io.openvidu.test.e2e.annotations;

import org.junit.jupiter.api.condition.DisabledIfEnvironmentVariable;
import org.junit.jupiter.api.condition.DisabledIfSystemProperty;
import org.springframework.test.context.junit.jupiter.DisabledIf;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@DisabledIf(expression = "#{systemProperties['MEDIA_SERVER'].toLowerCase().equals('mediasoup')}")
public @interface OnlyKurento {

}
